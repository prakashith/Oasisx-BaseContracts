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
const oasisBaseCont = artifacts.require("OasisXNFT721");
const oasisx1155Cont = artifacts.require("OasisX1155");

const oasisBaseABI = require("../abis/OasisXNFT721.json").abi;

// Web3.js
//const Web3 = require("web3");

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

// OasisXNFT721 contract test spec
contract(
  "NFT721BASE",
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
    let proxy1;
    let proxy2;
    let txStack = [];

    c = { ...conf.devnet };
    c2 = { ...conf.devnet };
    c3 = { ...conf.devnet };

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

    // console.log("\nCloning...");

    let data = web3.eth.abi.encodeParameters(
      [
        "string",
        "string",
        "string",
        "string",
        "bytes32",
        "address[]",
        "uint256[]",
        "uint256",
        "uint256",
        "uint64",
        "bool",
      ],
      [
        c.oasis721.token1.name,
        c.oasis721.token1.symbol,
        c.oasis721.token1.baseTokenURI,
        c.oasis721.token1.notRevealedUri,
        c.oasis721.token1.merkleRoot,
        c.oasis721.token1.payees,
        c.oasis721.token1.shares,
        c.oasis721.token1.maxTokenId,
        c.oasis721.token1.mintPrice,
        c.oasis721.token1.nftPerAddressLimit,
        c.oasis721.token1.reveal,
      ]
    );

    it("fails when trying to clone without NFT", async () => {
      let { factory } = await withContracts();

      await factory
        .create721(data, {
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

    it("clones base721 using tokenId 2", async () => {
      let { factory, nft1155 } = await withContracts();

      await nft1155.mint(owner, 2, 1, { from: owner, value: toTokens("0.05") });

      let clone1 = await factory.create721(data, {
        from: owner,
      });

      proxy1 = new web3.eth.Contract(oasisBaseABI, clone1.logs[0].args[0], {
        from: owner,
      });
    });

    it("clones base721 using tokenId 1 and then burns it", async () => {
      let { factory, nft1155 } = await withContracts();

      await nft1155.mint(user, 1, 1, { from: user, value: toTokens("0.01") });

      await nft1155.changeFactoryAddress(factory.address);

      let clone2 = await factory.create721(data, { from: user });

      proxy2 = new web3.eth.Contract(oasisBaseABI, clone2.logs[0].args[0], {
        from: user,
      });

      let userBalance = await nft1155.balanceOf(user, 1);

      assert.equal(userBalance, 0);
    });

    // Check name and symbol
    it("Proxy: Name is Oasis721 and symbol is OAS", async () => {
      let name1 = await proxy1.methods.name().call();
      let symbol1 = await proxy1.methods.symbol().call();
      assert.equal(name1, "OasisX721");

      assert.equal(symbol1, "OAS");
    });

    // Check minting costs
    it("Minting price must be 2 ether", async () => {
      let mintPrice1 = await proxy1.methods.mintPrice(0).call();

      assert.equal(mintPrice1, toTokens("2"));
    });

    // change mint price only owner
    it("Changing the minting price", async () => {
      let tx = await proxy1.methods
        .changeMintCost(toTokens("5"))
        .send({ from: owner })
        .catch(() => {
          assert.fail("could not update minting price");
        });
      txStack.push(tx);
      let mintPrice1 = await proxy1.methods.mintPrice(0).call();
      assert.equal(mintPrice1, toTokens("5"));
    });

    //change mint price invalid
    it("Changing the minting price", async () => {
      try {
        let tx = await proxy1.methods
          .changeMintCost(1)
          .send({ from: user })
          .catch(() => {
            assert.fail("could not update minting price");
          });
        txStack.push(tx);
      } catch (e) {
        assert.ok("User could not change mint price");
      }
    });

    // change base URI only owner
    it("Changing the base URI", async () => {
      let tx = await proxy1.methods
        .changeBaseURI("ipfs://testurl/")
        .send({ from: owner })
        .catch(() => {
          assert.fail("could not update base URI");
        });
      txStack.push(tx);
    });

    // change base URI invalid(from user)
    it("Changing the base URI should fail from user", async () => {
      let tx = await proxy1.methods
        .changeBaseURI("ipfs://untesturl/")
        .send({ from: user })
        .then(() => {
          assert.fail("user shouldnt be able to change base URI");
        })
        .catch((r) => {
          assert.ok("user was not able to change base URI");
          return r;
        });
      txStack.push(tx);
    });

    // change not Revealed URI only owner
    it("Changing the notRevealed URI", async () => {
      let tx = await proxy1.methods
        .changeNotRevealedURI("ipfs://testurl/1.json")
        .send({ from: owner })
        .catch(() => {
          assert.fail("could not update not Revealed URI");
        });
      txStack.push(tx);
    });

    // change not Revealed URI invalid
    it("Changing the notRevealed URI should fail from user", async () => {
      let tx = await proxy1.methods
        .changeNotRevealedURI("ipfs://untesturl/")
        .send({ from: user })
        .then(() => {
          assert.fail("user shouldnt be able to change base URI");
        })
        .catch((r) => {
          assert.ok("user was not able to change base URI");
          return r;
        });
      txStack.push(tx);
    });

    // Reveal and change base URI
    it("Reveal and change base URI", async () => {
      let tx = await proxy1.methods
        .reveal()
        .send({ from: owner })
        .catch(() => {
          assert.fail("could not reveal");
        });
      txStack.push(tx);

      let tx2 = await proxy1.methods
        .changeBaseURI("ipfs://testurl/")
        .send({ from: owner })
        .catch(() => {
          assert.ok("could not update base URI after reveal");
        });
      txStack.push(tx2);
    });

    // lock metadata and change base URI
    it("Lock metadata and change base URI", async () => {
      let tx = await proxy1.methods
        .lockMetadata()
        .send({ from: owner })
        .catch(() => {
          assert.fail("could not lock metadata");
        });
      txStack.push(tx);

      try {
        let tx2 = await proxy1.methods
          .changeBaseURI("ipfs://testurl/")
          .send({ from: owner })
          .catch(() => {
            assert.fail("could update base URI after lock");
          });
        txStack.push(tx2);
      } catch (e) {
        assert.ok("Could not change base URI after lock");
      }
    });

    // change merkleRoot only owner
    it("Changing the merkleRoot", async () => {
      let tx = await proxy1.methods
        .changeMerkleRoot(
          "0x8d42b9deb53fcd75d13e61cb6db7d4924b0b88257e147abd6c8768841c53340a"
        )
        .send({ from: owner })
        .catch(() => {
          assert.fail("Owner could not change merkle root");
        });
      txStack.push(tx);
    });

    // change merkleRoot should fail from user
    it("Changing the merkleRoot should fail from user", async () => {
      let tx = await proxy1.methods
        .changeMerkleRoot(
          "0xd79629950571057c94fdd2e85fb30a65813a962c2bada068ffb0f80794f7e796"
        )
        .send({ from: user })
        .catch((r) => {
          assert.ok("User was not able to change merkle root");
          return r;
        });
      txStack.push(tx);
    });

    // attempts admin mint
    it("Admin can mint", async () => {
      try {
        let tx = await proxy1.methods.adminMint(owner, 2).send({ from: owner });
        txStack.push(tx);
      } catch (e) {
        assert.fail("owner was not able to mint");
      }
    });

    // Checking token URI
    it("Checking token URI", async () => {
      let tokenURI = await proxy1.methods.tokenURI(1).call();
      assert.equal(tokenURI, "ipfs://testurl/1.json");
    });

    // attempts whitelisted user mint
    it("Whitelisted user can mint during Presale", async () => {
      let tx = await proxy1.methods
        .mint(whitelistedUser, 2, HexProof(whitelistedUser))
        .send({ from: whitelistedUser, value: toTokens("10"), gas: 300000 });
      txStack.push(tx);
    });

    // attempts user mint
    it("Not whitelisted user cannot mint during Presale", async () => {
      let tx = await proxy1.methods
        .mint(notWhitelistedUser, 1, HexProof(notWhitelistedUser))
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

    // locked, cannot change base URI
    it("Locked, cannot change base URI", async () => {
      let tx = await proxy1.methods
        .changeBaseURI("ipfs://untesturl/")
        .send({ from: owner })
        .then(() => {
          assert.fail("owner shouldnt be able to change locked base URI");
        })
        .catch((r) => {
          assert.ok("owner was not able to change locked base URI");
          return r;
        });
      txStack.push(tx);
    });

    // locked, cannot change not Revealed URI
    it("Revealed, cannot change not Revealed URI", async () => {
      let tx = await proxy1.methods
        .changeNotRevealedURI("ipfs://untesturl/10.json")
        .send({ from: owner })
        .then(() => {
          assert.fail("owner shouldn't be able to change reavelead art uri");
        })
        .catch((r) => {
          assert.ok("owner was not able to change revealed art uri");
          return r;
        });
      txStack.push(tx);
    });

    // Change minting phase to public sale
    it("Minting phase change to public sale", async () => {
      let tx = await proxy1.methods
        .setPhase(1, toTokens("3"), 3)
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

    // Attempts user mint during public sale
    it("Any user can mint during Public sale", async () => {
      let tx = await proxy1.methods
        .mint(notWhitelistedUser, 1, [])
        .send({ from: notWhitelistedUser, value: toTokens("3"), gas: 300000 });
      txStack.push(tx);
    });

    // change mint price only owner during public sale
    it("Changing the minting price", async () => {
      let tx = await proxy1.methods
        .changeMintCost(toTokens("4"))
        .send({ from: owner })
        .catch(() => {
          assert.fail("could not update minting price");
        });
      txStack.push(tx);
    });

    // Attempts user mint during public sale after mint price change
    it("Any user can mint during Public sale after mint price change", async () => {
      let tx = await proxy1.methods
        .mint(notWhitelistedUser, 1, [])
        .send({ from: notWhitelistedUser, value: toTokens("4") });
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
      assert.equal(
        Number((Number(a2due) + Number(a2prebal)).toFixed(2)),
        Number(Number(a2bal).toFixed(2))
      );
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

    it("Change clone access", async () => {
      let { factory } = await withContracts();

      await factory.changeCloneAccess({ from: owner });
      await factory.changeAccessFee([1], [toTokens("0.1")]);
    });

    it("User can create clone by paying fee after changing clone access", async () => {
      let { factory } = await withContracts();

      let clone3 = await factory.create721(data, {
        from: user2,
        value: toTokens("0.1"),
      });

      assert.ok(
        (proxy3 = new web3.eth.Contract(oasisBaseABI, clone3.logs[0].args[0], {
          from: user2,
        }))
      );
    });
  }
);
