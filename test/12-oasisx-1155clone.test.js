const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

// chai assert
const { assert } = chai;

// chai promises
chai.use(chaiAsPromised);

const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
const web3 = new Web3(provider);

// utils
const { toTokens } = require("../utils/test-utils")(web3);

// file system
const fs = require("fs");

// Hash tree
const { MerkleTree } = require("merkletreejs");

// hashing function
const keccak256 = require("keccak256");

// load contract artifact
const oasisFactoryCont = artifacts.require("OasisXLaunchFactory");
const oasisBaseCont = artifacts.require("OasisXNFT1155");
const oasisx1155Cont = artifacts.require("OasisX1155");

const oasisBaseABI = require("../abis/OasisXNFT1155.json").abi;

// load migration-parameters
const conf = require("../migration-parameters.js");
const { send } = require("process");
const { totalmem } = require("os");

// Root created and saved on migration
const tree = JSON.parse(fs.readFileSync("./merkle/tree.json"));
const Mroot = fs.readFileSync("./merkle/root.dat");

// MerkleTree object from our saved root
const merkleTreeObj = Object.setPrototypeOf(tree, MerkleTree.prototype);

// leaves - object to buffer
merkleTreeObj.leaves = tree.leaves.map((leaf) => Buffer.from(leaf));

// layers - object to buffer
merkleTreeObj.layers = tree.layers.map((layer) =>
  layer.map((item) => Buffer.from(item))
);

//OasisXNFT1155 contract test
contract(
  "NFT1155Base",
  ([
    owner,
    user,
    whitelistedUser,
    notWhitelistedUser,
    payee,
    user2,
    ...others
  ]) => {
    let base;
    let factory;
    let clone;
    let proxy1;
    let txStack = [];

    c = { ...conf.devnet };

    const deploy = async (contracts) =>
      Promise.all(contracts.map((contract) => contract.deployed()));

    const withContracts = async () => {
      let [factory, base, nft1155] = await deploy([
        oasisFactoryCont,
        oasisBaseCont,
        oasisx1155Cont,
      ]);
      return {
        factory,
        base,
        nft1155,
      };
    };

    const HexProof = (account) => {
      return merkleTreeObj.getHexProof(keccak256(account));
    };

    let data = web3.eth.abi.encodeParameters(
      [
        "string",
        "string",
        "string",
        "bytes32",
        "address[]",
        "uint256[]",
        "uint256[]",
        "uint256[]",
        "uint256",
        "uint256",
        "uint64",
      ],
      [
        c.oasis1155.token1.name,
        c.oasis1155.token1.symbol,
        c.oasis1155.token1.uri,
        c.oasis1155.token1.merkleRoot,
        c.oasis1155.token1.payees,
        c.oasis1155.token1.shares,
        c.oasis1155.token1.tokenIds,
        c.oasis1155.token1.tokenSupplies,
        c.oasis1155.token1.maxTokenId,
        c.oasis1155.token1.mintPrice,
        c.oasis1155.token1.mintsPerAddressLimit,
      ]
    );

    it("fails when trying to clone without NFT", async () => {
      let { factory } = await withContracts();

      await factory
        .create1155(data, {
          from: owner,
        })
        .then(() => {
          assert.fail("user shouldnt be able to create clone without nft");
        })
        .catch((r) => {
          assert.ok("user was not able to create clone without nft");
          return r;
        });
    });

    it("clones base1155 using any token id", async () => {
      let { factory, nft1155 } = await withContracts();

      await nft1155.mint(owner, 0, 1, { from: owner, value: 0 });

      clone1 = await factory.create1155(data, { from: owner });

      assert.ok(
        (proxy1 = new web3.eth.Contract(oasisBaseABI, clone1.logs[0].args[0], {
          from: owner,
        }))
      );

      await nft1155.mint(user, 1, 1, { from: user, value: toTokens("0.01") });

      clone2 = await factory.create1155(data, { from: user });

      assert.ok(
        (proxy2 = new web3.eth.Contract(oasisBaseABI, clone2.logs[0].args[0], {
          from: user,
        }))
      );

      await nft1155.mint(user2, 2, 1, { from: user2, value: toTokens("0.05") });

      clone3 = await factory.create1155(data, { from: user2 });

      assert.ok(
        (proxy3 = new web3.eth.Contract(oasisBaseABI, clone3.logs[0].args[0], {
          from: user2,
        }))
      );
    });

    // Check name and symbol
    it("Proxy: Name is Oasis1155 and symbol is OAS1155", async () => {
      let name = await proxy1.methods.name().call();
      let symbol = await proxy1.methods.symbol().call();
      assert.equal(name, "OasisX1155");
      assert.equal(symbol, "OAS1155");
    });

    // Check minting costs
    it("Minting price must be 1 ether", async () => {
      let mintPrice = await proxy1.methods.mintPrice(0).call();
      assert.equal(mintPrice, toTokens("1"));
    });

    // Change minting price
    it("Changing the minting price", async () => {
      let tx = await proxy1.methods
        .changeMintCost(toTokens("2"))
        .send({ from: owner })
        .catch(() => {
          assert.fail("could not update minting price");
        });
      txStack.push(tx);
      let mintPrice1 = await proxy1.methods.mintPrice(0).call();
      let mintPrice2 = await proxy2.methods.mintPrice(0).call();
      assert.equal(mintPrice1, toTokens("2"));
      assert.equal(mintPrice2, toTokens("1"));
    });

    // Whitelisted user mint during presale
    it("Whitelisted user can mint during Presale", async () => {
      let tx = await proxy1.methods
        .mint(whitelistedUser, 4, 3, HexProof(whitelistedUser))
        .send({ from: whitelistedUser, value: toTokens("6"), gas: 300000 });
      txStack.push(tx);
    });

    // Minted NFTs transfer
    it("Whitelisted user can transfer minted NFTs during preSale", async () => {
      let tx = await proxy1.methods
        .transferFrom(
          whitelistedUser,
          notWhitelistedUser,
          4,
          2,
          web3.utils.fromAscii("")
        )
        .send({ from: whitelistedUser, gas: 300000 });
      txStack.push(tx);
    });

    // Invalid mint
    it("Not whitelisted user cannot mint during Presale", async () => {
      let tx = await proxy1.methods
        .mint(notWhitelistedUser, 1, 5, HexProof(notWhitelistedUser))
        .send({ from: notWhitelistedUser, value: toTokens("2") })
        .then(() => {
          assert.fail("not Whitelisted user should not have been able to mint");
        })
        .catch((r) => {
          assert.ok(
            "During presale , not whitelisted user was not able to mint"
          );
          return r;
        });
      txStack.push(tx);
    });

    // Change merkleRoot
    it("Changing the merkleRoot", async () => {
      let tx = await proxy1.methods
        .changeMerkleRoot(
          "0xf19cba932303088ee08ccdf705cc51dc5fcddc05af672df8fbb04a4123651115"
        )
        .send({ from: owner })
        .catch(() => {
          assert.fail("Owner could not change merkle root");
        });
      txStack.push(tx);
    });

    // Change merkleRoot should fail from user
    it("Changing the merkleRoot should fail from user", async () => {
      let tx = await proxy1.methods
        .changeMerkleRoot(
          "0xf19cba932303088ee08ccdf705cc51dc5fcddc05af672df8fbb04a4123651115"
        )
        .send({ from: user })
        .catch((r) => {
          assert.ok("User was not able to change merkle root");
          return r;
        });
      txStack.push(tx);
    });

    // Public Sale
    it("Minting phase change to public sale", async () => {
      let tx = await proxy1.methods
        .setPhase(1, toTokens("3"), 10)
        .send({ from: owner })
        .catch(() => {
          assert.fail("could not update minting phase");
        });
      let phase = await proxy1.methods.getPhase().call();
      let mintPrice = await proxy1.methods.mintPrice(phase[0]).call();
      txStack.push(tx);
      assert.equal(phase[0], 1);
      assert.equal(mintPrice, toTokens("3"));
    });

    // Any user can mint during public sale
    it("Any user can mint during Public sale", async () => {
      let tx = await proxy1.methods
        .mint(notWhitelistedUser, 9, 2, [])
        .send({ from: notWhitelistedUser, value: toTokens("6"), gas: 450000 });
      txStack.push(tx);
    });

    // User can transfer minted NFTs
    it("Any user can transfer minted NFTs", async () => {
      let tx = await proxy1.methods
        .transferFrom(notWhitelistedUser, whitelistedUser, 9, 1, [])
        .send({ from: notWhitelistedUser, gas: 450000 });
      txStack.push(tx);
    });

    it("Owner can add new tokens with their respective supply", async () => {
      let tx = await proxy1.methods
        .addTokensAndChangeMaxSupply([21, 22], [1, 2], 23)
        .send({ from: owner });
      txStack.push(tx);
    });

    it("User can mint newly added tokens", async () => {
      let tx = await proxy1.methods
        .mint(whitelistedUser, 21, 1, [])
        .send({ from: whitelistedUser, value: toTokens("3"), gas: 300000 });
      txStack.push(tx);
    });

    it("Payee 0 is owner", async () => {
      let payee0 = await proxy1.methods.getPayees().call();
      assert.equal(payee0[0], owner);
    });

    it("Payee 1 is user", async () => {
      let payee1 = await proxy1.methods.getPayees().call();
      assert.equal(payee1[1], payee);
    });

    it("Payee Claiming his shares from minting", async () => {
      const a2prebal = await web3.eth.getBalance(payee);
      const a2due = Number(await proxy1.methods.getDuePayment(payee).call());
      await proxy1.methods.release(payee).send();
      const a2bal = await web3.eth.getBalance(payee);
      const a2postdue = Number(
        await proxy1.methods.getDuePayment(payee).call()
      );
      assert.equal(Number(a2due) + Number(a2prebal), Number(a2bal));
      assert.equal(a2postdue, 0);
    });

    it("Payee Claiming his already-claimed share should fail", async () => {
      await proxy1.methods
        .release(whitelistedUser)
        .send({ from: whitelistedUser })
        .then(() => {
          assert.fail("account was able to release more than due");
        })
        .catch(() => {
          assert.ok("account was not able to releas un-due funds");
        });
    });

    it("User can mint in batch", async () => {
      let tx = await proxy1.methods
        .mintBatch(notWhitelistedUser, [4, 5], [1, 1], [])
        .send({ from: notWhitelistedUser, value: toTokens("6"), gas: 450000 });
      assert.ok(tx);
      txStack.push(tx);
    });

    it("User can transfer NFTs in batch", async () => {
      let tx = await proxy1.methods
        .batchTransferFrom(
          notWhitelistedUser,
          whitelistedUser,
          [4, 5],
          [1, 1],
          []
        )
        .send({ from: notWhitelistedUser, gas: 450000 });
      assert.ok(tx);
      txStack.push(tx);
    });
  }
);
