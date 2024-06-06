/* Contracts in this test */
const OasisXStorefront = artifacts.require("OasisXStorefront");
const OasisXRegistry = artifacts.require("OasisXRegistry");
const OasisXStatic = artifacts.require("OasisXStatic");
const OasisXExchange = artifacts.require("OasisXExchange");
const OasisXAtomicizer = artifacts.require("OasisXAtomicizer");
const TestERC20 = artifacts.require("TestERC20");

const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

//chai assert
const { assert } = chai;

// chai promises
chai.use(chaiAsPromised);

const { wrap, ZERO_BYTES32 } = require("../utils/util");

// utils
const { toTokens, fromTokens } = require("../utils/test-utils")(web3);

// file system
const fs = require("fs");

/* Useful aliases */
const toBN = web3.utils.toBN;

contract(
  "OasisXStorefront",
  ([
    owner,
    creator,
    userA,
    userB,
    userC,
    userD,
    userE,
    userF,
    userG,
    ...others
  ]) => {
    const NAME = "OasisX Storefront";
    const SYMBOL = "OasisX";

    const INITIAL_TOKEN_ID = 1;
    const SECOND_TOKEN_ID = 2;
    const THIRD_TOKEN_ID = 3;
    const FOURTH_TOKEN_ID = 4;
    const FIFTH_TOKEN_ID = 5;
    const SIXTH_TOKEN_ID = 6;
    const NON_EXISTENT_TOKEN_ID = 99999999;

    const MINT_AMOUNT = 1;
    const OVERFLOW_NUMBER = toBN(2, 10).pow(toBN(256, 10)).sub(toBN(1, 10));

    let storefront;
    let proxy;

    const deploy = async (contracts) =>
      Promise.all(contracts.map((contract) => contract.deployed()));

    const withContracts = async () => {
      let [exchange, statici, registry, storefront, atomicizer, erc20] =
        await deploy([
          OasisXExchange,
          OasisXStatic,
          OasisXRegistry,
          OasisXStorefront,
          OasisXAtomicizer,
          TestERC20,
        ]);
      return {
        exchange: wrap(exchange),
        statici,
        registry,
        storefront,
        atomicizer,
        erc20,
      };
    };

    it("is deployed", async () => {
      return await OasisXStorefront.deployed();
    });

    it("should allow owner to mint tokens", async () => {
      let { storefront } = await withContracts();
      await storefront.addSharedProxyAddress(owner);
      await storefront.mint(userA, INITIAL_TOKEN_ID, MINT_AMOUNT, "0x0", {
        from: owner,
      });
      let supply = await storefront.totalSupply(INITIAL_TOKEN_ID);
      assert.equal(supply, MINT_AMOUNT);
    });

    it("should not allow non-owner to mint tokens", async () => {
      let { storefront } = await withContracts();
      await storefront
        .mint(userC, INITIAL_TOKEN_ID, MINT_AMOUNT, "0x0", {
          from: userB,
        })
        .then(() => {
          assert.fail("only owner or proxy allowed");
        })
        .catch((r) => {
          assert.ok("user with no permission should not be able to mint");
        });
    });

    it("totalSupply should return null for non-existent token id", async () => {
      let { storefront } = await withContracts();
      let supply = await storefront.totalSupply(NON_EXISTENT_TOKEN_ID);
      assert.equal(supply, 0);
    });

    // it("should correctly set totalSupply", async () => {
    //   await storefront.batchMint(
    //     userA,
    //     [INITIAL_TOKEN_ID],
    //     [MINT_AMOUNT],
    //     "0x0",
    //     {
    //       from: owner,
    //     }
    //   );
    //   const supply = await storefront.totalSupply(INITIAL_TOKEN_ID);
    //   assert.isOk(supply.eq(MINT_AMOUNT.mul(toBN(3))));
    // });

    it("should require that caller has permission to mint each token", async () => {
      let { storefront } = await withContracts();
      await storefront
        .batchMint(
          userA,
          [INITIAL_TOKEN_ID, SECOND_TOKEN_ID],
          [MINT_AMOUNT],
          "0x0",
          {
            from: userB,
          }
        )
        .then(() => {
          assert.fail(
            "should require that caller has permissions to mint each token"
          );
        })
        .catch((r) => {
          assert.ok("caller with no permission should not be able to mint");
        });
    });

    it("should return true for existing token id", async () => {
      let { storefront } = await withContracts();
      itExists = await storefront.exists(INITIAL_TOKEN_ID);
      assert.isTrue(itExists);
    });

    it("should return false for non-existent token id", async () => {
      let { storefront } = await withContracts();
      itExists = await storefront.exists(NON_EXISTENT_TOKEN_ID);
      assert.isFalse(itExists);
    });

    it("owner should be able to transfer ownership", async () => {
      let { storefront } = await withContracts();
      assert(
        await storefront.safeTransferFrom(
          userA,
          userB,
          INITIAL_TOKEN_ID,
          1,
          web3.utils.fromAscii(""),
          { from: userA }
        )
      );
    });

    it("should mint tokens on transfer", async () => {
      let { storefront } = await withContracts();
      await storefront.addSharedProxyAddress(userA);
      await storefront.safeTransferFrom(
        userA,
        userB,
        FOURTH_TOKEN_ID,
        1,
        web3.utils.fromAscii(""),
        { from: userA }
      );
      amountOfUserB = await storefront.balanceOf(userB, FOURTH_TOKEN_ID);
      assert.equal(amountOfUserB, 1);
    });

    it("user should not be able to transfer non existent token", async () => {
      let { storefront } = await withContracts();
      await storefront
        .safeTransferFrom(
          userA,
          userB,
          NON_EXISTENT_TOKEN_ID,
          1,
          web3.utils.fromAscii(""),
          { from: userA }
        )
        .then(() => {
          assert.fail("user should not be able to transfer non existent token");
        })
        .catch((r) => {
          assert.ok("user should not be able to transfer non existent token");
          return r;
        });
    });

    it("owner should not be able to transfer 0 amount", async () => {
      let { storefront } = await withContracts();
      await storefront
        .safeTransferFrom(
          userA,
          userB,
          INITIAL_TOKEN_ID,
          0,
          web3.utils.fromAscii(""),
          { from: userA }
        )
        .then(() => {
          assert.fail("owner should not be able to transfer 0 amount");
        })
        .catch((r) => {
          assert.ok("owner should not be able to transfer 0 amount");
          return r;
        });
    });

    it("not approved user should not be able to transfer", async () => {
      let { storefront } = await withContracts();
      await storefront
        .safeTransferFrom(
          userC,
          userB,
          INITIAL_TOKEN_ID,
          1,
          web3.utils.fromAscii(""),
          { from: userC }
        )
        .then(() => {
          assert.fail("not approved user should not be able to transfer");
        })
        .catch((r) => {
          assert.ok("not approved user should not be able to transfer");
          return r;
        });
    });

    it("should return balance of user", async () => {
      let { storefront } = await withContracts();
      let balanceOfUser = await storefront.balanceOf(userB, INITIAL_TOKEN_ID);
      assert.equal(balanceOfUser, 1);
    });

    it("should return null if user owns no tokens", async () => {
      let { storefront } = await withContracts();
      let balanceOfUser = await storefront.balanceOf(userC, INITIAL_TOKEN_ID);
      assert.equal(balanceOfUser, 0);
    });

    it("should return null for non-owner", async () => {
      let { storefront } = await withContracts();
      let batchBalanceOfUser = await storefront.balanceOfBatch(
        [userC],
        [INITIAL_TOKEN_ID]
      );
      assert.equal(batchBalanceOfUser, 0);
    });

    // it("should return batch balances of users", async () => {
    //   await storefront.mint(userC, INITIAL_TOKEN_ID, 5, "0x0", {
    //     from: owner,
    //   });
    //   let batchBalanceOfUser = await storefront.balanceOfBatch(
    //     [userC],
    //     [INITIAL_TOKEN_ID]
    //   );
    //   assert.equal(batchBalanceOfUser, 5);
    // });

    it("should fail on array length mismatch", async () => {
      let { storefront } = await withContracts();
      let accounts = [userA];
      let tokenIds = [10000, 20000];

      await storefront
        .balanceOfBatch(accounts, tokenIds)
        .then(() => {
          assert.fail("array length mismatch");
        })
        .catch((r) => {
          assert.ok("array length mismatch");
          return r;
        });
    });

    it("not approved user should not be able to burn tokens", async () => {
      let { storefront } = await withContracts();
      await storefront
        .burn(userA, INITIAL_TOKEN_ID, MINT_AMOUNT)
        .then(() => {
          assert.fail("user should not be able to burn tokens");
        })
        .catch((r) => {
          assert.ok("not approved user should not be able to burn");
          return r;
        });
    });

    it("owner should be able to burn tokens", async () => {
      let { storefront } = await withContracts();
      await storefront.mint(owner, THIRD_TOKEN_ID, MINT_AMOUNT, "0x0", {
        from: owner,
      });
      await storefront.mint(owner, THIRD_TOKEN_ID, MINT_AMOUNT, "0x0", {
        from: owner,
      });
      supply = await storefront.totalSupply(THIRD_TOKEN_ID);
      burned = await storefront.burn(owner, THIRD_TOKEN_ID, MINT_AMOUNT);
      supplyAfterBurn = await storefront.totalSupply(THIRD_TOKEN_ID);
      assert.notEqual(supply, supplyAfterBurn);
    });

    it("user with no tokens should not be able to transfer tokens", async () => {
      let { storefront } = await withContracts();
      await storefront
        .safeBatchTransferFrom(
          userC,
          userA,
          [INITIAL_TOKEN_ID, SECOND_TOKEN_ID],
          [3, 4],
          web3.utils.fromAscii(""),
          { from: userC }
        )
        .then(() => {
          assert.fail("not owner should not be able to transfer tokens");
        })
        .catch((r) => {
          assert.ok("not owner should not be able to transfer tokens");
          return r;
        });
    });

    it("owner should be able to transfer multiple token ids at once", async () => {
      let { storefront } = await withContracts();
      await storefront.addSharedProxyAddress(userB);
      await storefront.mint(userB, SECOND_TOKEN_ID, 1, "0x0", {
        from: owner,
      });
      assert.ok(
        await storefront.safeBatchTransferFrom(
          userB,
          userC,
          [INITIAL_TOKEN_ID, SECOND_TOKEN_ID],
          [1, 1],
          web3.utils.fromAscii(""),
          { from: userA }
        )
      );
    });

    it("should mint multiple tokens on transfer", async () => {
      let { storefront } = await withContracts();
      await storefront.addSharedProxyAddress(creator);
      assert.ok(
        await storefront.safeBatchTransferFrom(
          creator,
          userC,
          [FIFTH_TOKEN_ID, SIXTH_TOKEN_ID],
          [MINT_AMOUNT, MINT_AMOUNT],
          web3.utils.fromAscii(""),
          { from: creator }
        )
      );
    });

    // it("owner should be able to transfer multiple tokens of same id at once", async () => {
    //   assert.ok(
    //     await storefront.safeBatchTransferFrom(
    //       userB,
    //       userA,
    //       [INITIAL_TOKEN_ID],
    //       [2],
    //       web3.utils.fromAscii(""),
    //       { from: userB }
    //     )
    //   );
    // });

    it("allows proxy transfer approval", async () => {
      let { registry, storefront } = await withContracts();
      await registry.registerProxy({ from: owner });
      let proxy = await registry.proxies(owner);
      assert.isTrue(proxy.length > 0, "No proxy address");

      await registry.registerProxy({ from: creator });
      let proxy1 = await registry.proxies(creator);
      assert.isTrue(proxy1.length > 0, "No proxy address");

      assert.isOk(await storefront.setApprovalForAll(proxy, true));
    });

    it("erc1155-eth lazy mint with fees", async () => {
      let price = toTokens("1");

      let croyalties = 500;

      maximumFill = 1;

      fillCount = 1;

      let nfts = [
        toBN(
          owner.split("0x")[1].toString() + "00000000000001" + "0000000001",
          16
        ),
      ];

      let { exchange, registry, statici, storefront } = await withContracts();
      await registry.grantInitialExchangeAuthentication(exchange.inst.address);

      const storefrontc = new web3.eth.Contract(
        storefront.abi,
        storefront.address
      );

      const selector = web3.eth.abi.encodeFunctionSignature(
        "ERC1155WithValue(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );

      const selector1 = web3.eth.abi.encodeFunctionSignature(
        "any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );

      const paramsOne = web3.eth.abi.encodeParameters(
        ["address[2]", "uint256[3]", "bytes"],
        [[userD, storefront.address], [nfts[0], price, croyalties], "0x00"]
      );

      const one = {
        registry: registry.address,
        maker: owner,
        staticTarget: statici.address,
        staticSelector: selector1,
        staticExtradata: paramsOne,
        maximumFill: fillCount,
        listingTime: "0",
        expirationTime: "100000000000",
        salt: "2332",
      };

      const two = {
        registry: registry.address,
        maker: creator,
        staticTarget: statici.address,
        staticSelector: selector1,
        staticExtradata: "0x",
        maximumFill: "1",
        listingTime: "0",
        expirationTime: "100000000000",
        salt: "2333",
      };

      const firstData = storefrontc.methods
        .safeTransferFrom(owner, creator, nfts[0], fillCount, "0x")
        .encodeABI();

      const firstCall = {
        target: storefront.address,
        howToCall: 0,
        data: firstData,
      };

      const secondCall = {
        target: statici.address,
        howToCall: 0,
        data: web3.eth.abi.encodeFunctionSignature("any()"),
      };

      let sigOne = await exchange.sign(one, owner);
      let sigTwo = await exchange.sign(two, creator);

      await exchange.atomicMatch(
        one,
        sigOne,
        firstCall,
        two,
        sigTwo,
        secondCall,
        ZERO_BYTES32,
        { from: userE, value: price * fillCount }
      );

      let balanceProtocol = await web3.eth.getBalance(userF);
      console.log(fromTokens(balanceProtocol));

      let balanceCreator = await web3.eth.getBalance(userD);
      console.log(fromTokens(balanceCreator));

      let balanceBuyer = await web3.eth.getBalance(creator);
      console.log(fromTokens(balanceBuyer));

      let balanceMaker = await web3.eth.getBalance(owner);
      console.log(fromTokens(balanceMaker));

      let [account_1_erc1155_balance] = await Promise.all([
        storefront.balanceOf(creator, nfts[0]),
      ]);

      assert.equal(
        account_1_erc1155_balance.toNumber(),
        fillCount,
        "Incorrect ERC1155 balance"
      );
    });

    it("matches erc1155 <> erc20 order, partial fills in 1 transaction with fees", async () => {
      let eddy = userD;
      let sam = userE;
      let protocolWallet = userG;
      let creatorWallet = userF;

      let price = 1000;
      let protocolFee = 2;
      let creatorFee = 5;

      maximumFill = 1;

      fillCount = 1;

      txCount = 1;

      let nfts = [
        toBN(
          eddy.split("0x")[1].toString() + "00000000000002" + "0000000002",
          16
        ),
      ];

      let protocolAmount = (price * protocolFee * fillCount) / 100;
      let creatorAmount = (price * creatorFee * fillCount) / 100;
      let sellerAmount = price * fillCount - (protocolAmount + creatorAmount);

      let { atomicizer, exchange, registry, statici, storefront, erc20 } =
        await withContracts();

      // await registry.grantInitialExchangeAuthentication(exchange.inst.address);

      const atomicizerc = new web3.eth.Contract(
        atomicizer.abi,
        atomicizer.address
      );

      const storefrontc = new web3.eth.Contract(
        storefront.abi,
        storefront.address
      );

      await registry.registerProxy({ from: eddy });
      let proxy2 = await registry.proxies(eddy);
      assert.equal(true, proxy2.length > 0, "no proxy address for account a");

      await registry.registerProxy({ from: sam });
      let proxy3 = await registry.proxies(sam);
      assert.equal(true, proxy3.length > 0, "no proxy address for account b");

      await Promise.all([
        storefront.setApprovalForAll(proxy2, true, { from: eddy }),
        erc20.approve(proxy3, fillCount * price, { from: sam }),
      ]);
      await Promise.all([erc20.mint(sam, fillCount * price)]);

      const erc20c = new web3.eth.Contract(erc20.abi, erc20.address);
      const selectorOne = web3.eth.abi.encodeFunctionSignature(
        "anyERC1155ForERC20ExactTo(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );
      const selectorTwo = web3.eth.abi.encodeFunctionSignature(
        "anyERC20ForERC1155ExactTo(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );

      const selector = web3.eth.abi.encodeFunctionSignature(
        "any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );

      const paramsOne = web3.eth.abi.encodeParameters(
        ["address[2]", "uint256[3]"],
        [
          [storefront.address, erc20.address],
          [nfts[0], 1, sellerAmount],
        ]
      );

      const paramsTwo = web3.eth.abi.encodeParameters(
        ["address[2]", "uint256[3]"],
        [
          [erc20.address, storefront.address],
          [nfts[0], sellerAmount, 1],
        ]
      );

      const one = {
        registry: registry.address,
        maker: eddy,
        staticTarget: statici.address,
        staticSelector: selector,
        staticExtradata: paramsOne,
        maximumFill: maximumFill,
        listingTime: "0",
        expirationTime: "10000000000",
        salt: "11",
      };

      const two = {
        registry: registry.address,
        maker: sam,
        staticTarget: statici.address,
        staticSelector: selector,
        staticExtradata: paramsTwo,
        maximumFill: price * fillCount,
        listingTime: "0",
        expirationTime: "10000000000",
        salt: "12",
      };
      const firstData = storefrontc.methods
        .safeTransferFrom(eddy, sam, nfts[0], fillCount, "0x")
        .encodeABI();

      const firstCall = {
        target: storefront.address,
        howToCall: 0,
        data: firstData,
      };
      const c1 = erc20c.methods
        .transferFrom(sam, eddy, sellerAmount)
        .encodeABI();
      const c2 = erc20c.methods
        .transferFrom(sam, protocolWallet, protocolAmount)
        .encodeABI();
      const c3 = erc20c.methods
        .transferFrom(sam, creatorWallet, creatorAmount)
        .encodeABI();
      const secondData = atomicizerc.methods
        .atomicize(
          [erc20.address, erc20.address, erc20.address],
          [0, 0, 0],
          [(c1.length - 2) / 2, (c2.length - 2) / 2, (c3.length - 2) / 2],
          c1 + c2.slice("2") + c3.slice("2")
        )
        .encodeABI();

      const secondCall = {
        target: atomicizer.address,
        howToCall: 1,
        data: secondData,
      };

      let sigOne = await exchange.sign(one, eddy);

      for (var i = 0; i < txCount; ++i) {
        let sigTwo = await exchange.sign(two, sam);
        await exchange.atomicMatchWith(
          one,
          sigOne,
          firstCall,
          two,
          sigTwo,
          secondCall,
          ZERO_BYTES32,
          { from: sam }
        );
        two.salt++;
      }

      let [eddy_balance, protocol_balance, creator_balance, sam_balance] =
        await Promise.all([
          erc20.balanceOf(eddy),
          erc20.balanceOf(protocolWallet),
          erc20.balanceOf(creatorWallet),
          storefront.balanceOf(sam, nfts[0]),
        ]);
      assert.equal(
        eddy_balance.toNumber(),
        sellerAmount,
        "Incorrect ERC20 balance"
      );
      assert.equal(
        protocol_balance.toNumber(),
        protocolAmount,
        "Incorrect ERC20 balance"
      );
      assert.equal(
        creator_balance.toNumber(),
        creatorAmount,
        "Incorrect ERC20 balance"
      );
      assert.equal(
        sam_balance.toNumber(),
        fillCount,
        "Incorrect ERC1155 balance"
      );
    });
  }
);
