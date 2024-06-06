const OasisXAtomicizer = artifacts.require("OasisXAtomicizer");
const OasisXExchange = artifacts.require("OasisXExchange");
const OasisXStatic = artifacts.require("OasisXStatic");
const OasisXRegistry = artifacts.require("OasisXRegistry");
const TestERC20 = artifacts.require("TestERC20");
const TestERC721 = artifacts.require("TestERC721");
const TestERC1155 = artifacts.require("TestERC1155");

const { fromWei, toBN } = require("web3-utils");

const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
const web3 = new Web3(provider);

const {
  wrap,
  ZERO_BYTES32,
  NULL_SIG,
  getProtocolFeeStruct,
} = require("../utils/util");

const { toTokens, fromTokens, checkEventEmitted } =
  require("../utils/test-utils")(web3);

contract("OasisXExchange", (accounts) => {
  const deploy = async (contracts) =>
    Promise.all(contracts.map((contract) => contract.deployed()));

  const withContracts = async () => {
    let [exchange, statici, registry, atomicizer, erc20, erc721, erc1155] =
      await deploy([
        OasisXExchange,
        OasisXStatic,
        OasisXRegistry,
        OasisXAtomicizer,
        TestERC20,
        TestERC721,
        TestERC1155,
      ]);
    return {
      exchange: wrap(exchange),
      statici,
      registry,
      atomicizer,
      erc20,
      erc721,
      erc1155,
    };
  };

  it("Grant initial exchange authentication", async () => {
    let { registry, exchange } = await withContracts();
    await registry.grantInitialExchangeAuthentication(exchange.inst.address);
  });

  const withAsymmetricalTokens = async () => {
    let { erc721 } = await withContracts();
    let nfts = [10, 11];
    await Promise.all([
      erc721.mint(accounts[0], nfts[0]),
      erc721.mint(accounts[0], nfts[1]),
    ]);
    return { nfts, erc721 };
  };

  const withAsymmetricalTokens2 = async () => {
    let { erc721 } = await withContracts();
    let nfts = [12, 13];
    await Promise.all([
      erc721.mint(accounts[0], nfts[0]),
      erc721.mint(accounts[0], nfts[1]),
    ]);
    return { nfts, erc721 };
  };

  it("allows proxy transfer approval", async () => {
    let { registry, erc721, erc1155 } = await withContracts();
    await registry.registerProxy({ from: accounts[0] });
    let proxy = await registry.proxies(accounts[0]);
    assert.isTrue(proxy.length > 0, "No proxy address");

    await registry.registerProxy({ from: accounts[1] });
    let proxy1 = await registry.proxies(accounts[1]);
    assert.isTrue(proxy1.length > 0, "No proxy address");

    assert.isOk(await erc721.setApprovalForAll(proxy, true));
    assert.isOk(await erc1155.setApprovalForAll(proxy, true));
  });

  it("matches erc721-eth order with checks", async () => {
    let price = toTokens("45");
    let croyalties = 500;
    let eddy = accounts[0];
    let { nfts, erc721 } = await withAsymmetricalTokens2();
    let { exchange, registry, statici } = await withContracts();
    const erc721c = new web3.eth.Contract(erc721.abi, erc721.address);
    const selector = web3.eth.abi.encodeFunctionSignature(
      "ERC721WithValue(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );
    const selector1 = web3.eth.abi.encodeFunctionSignature(
      "any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );

    let tokenId = [
      toBN(
        eddy.split("0x")[1].toString() + "00000000000002" + "0000000002",
        16
      ),
    ];

    const paramsOne = web3.eth.abi.encodeParameters(
      ["address[2]", "uint256[3]", "bytes"],
      [
        [accounts[9], erc721.address],
        [nfts[1], price, croyalties],
        web3.eth.abi.encodeParameters(
          ["address", "address", "uint256", "uint256"],
          [accounts[0], accounts[2], 100, tokenId.toString()]
        ),
      ]
    );

    const one = {
      registry: registry.address,
      maker: accounts[0],
      staticTarget: statici.address,
      staticSelector: selector,
      staticExtradata: paramsOne,
      maximumFill: "1",
      listingTime: "0",
      expirationTime: "100000000000",
      salt: "2332",
    };

    const two = {
      registry: registry.address,
      maker: accounts[1],
      staticTarget: statici.address,
      staticSelector: selector1,
      staticExtradata: "0x",
      maximumFill: "1",
      listingTime: "0",
      expirationTime: "100000000000",
      salt: "2333",
    };
    const firstData = erc721c.methods
      .transferFrom(accounts[0], accounts[1], nfts[1])
      .encodeABI();

    const firstCall = { target: erc721.address, howToCall: 0, data: firstData };

    const secondCall = {
      target: statici.address,
      howToCall: 0,
      data: web3.eth.abi.encodeFunctionSignature("any()"),
    };

    let sigOne = await exchange.sign(one, accounts[0]);
    // let sigOne = NULL_SIG;
    let sigTwo = await exchange.sign(two, accounts[1]);
    await exchange.atomicMatchWith(
      one,
      sigOne,
      firstCall,
      two,
      sigTwo,
      secondCall,
      ZERO_BYTES32,
      { from: accounts[1], value: 45e18 }
    );

    let balanceProtocol = await web3.eth.getBalance(accounts[7]);
    console.log(fromTokens(balanceProtocol));

    let balanceReferrer = await web3.eth.getBalance(accounts[2]);
    console.log(fromTokens(balanceReferrer));

    let balanceCreator = await web3.eth.getBalance(accounts[9]);
    console.log(fromTokens(balanceCreator));

    let balanceBuyer = await web3.eth.getBalance(accounts[1]);
    console.log(fromTokens(balanceBuyer));

    let balanceMaker = await web3.eth.getBalance(accounts[0]);
    console.log(fromTokens(balanceMaker));

    assert.equal(await erc721.ownerOf(nfts[1]), accounts[1], "Incorrect owner");
  });

  it("matches erc1155-eth order with checks", async () => {
    let price = toTokens("1");

    let croyalties = 500;

    maximumFill = 6;

    fillCount = 4;

    let nfts = [12];

    let { exchange, registry, statici, erc1155 } = await withContracts();

    const erc1155c = new web3.eth.Contract(erc1155.abi, erc1155.address);

    await erc1155.mint(accounts[0], nfts[0], maximumFill);

    const selector = web3.eth.abi.encodeFunctionSignature(
      "ERC1155WithValue(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );

    const selector1 = web3.eth.abi.encodeFunctionSignature(
      "any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );

    const paramsOne = web3.eth.abi.encodeParameters(
      ["address[2]", "uint256[3]", "bytes"],
      [[accounts[9], erc1155.address], [nfts[0], price, croyalties], "0x"]
    );

    const one = {
      registry: registry.address,
      maker: accounts[0],
      staticTarget: statici.address,
      staticSelector: selector,
      staticExtradata: paramsOne,
      maximumFill: maximumFill,
      listingTime: "0",
      expirationTime: "100000000000",
      salt: "2332",
    };

    const two = {
      registry: registry.address,
      maker: accounts[1],
      staticTarget: statici.address,
      staticSelector: selector1,
      staticExtradata: "0x",
      maximumFill: "1",
      listingTime: "0",
      expirationTime: "100000000000",
      salt: "2333",
    };

    const firstData = erc1155c.methods
      .safeTransferFrom(accounts[0], accounts[1], nfts[0], fillCount, "0x")
      .encodeABI();

    const firstCall = {
      target: erc1155.address,
      howToCall: 0,
      data: firstData,
    };

    const secondCall = {
      target: statici.address,
      howToCall: 0,
      data: web3.eth.abi.encodeFunctionSignature("any()"),
    };

    let sigOne = await exchange.sign(one, accounts[0]);
    let sigTwo = await exchange.sign(two, accounts[1]);

    await exchange.atomicMatchWith(
      one,
      sigOne,
      firstCall,
      two,
      sigTwo,
      secondCall,
      ZERO_BYTES32,
      { from: accounts[5], value: price * fillCount }
    );

    let balanceProtocol = await web3.eth.getBalance(accounts[7]);
    console.log(fromTokens(balanceProtocol));

    let balanceCreator = await web3.eth.getBalance(accounts[9]);
    console.log(fromTokens(balanceCreator));

    let balanceBuyer = await web3.eth.getBalance(accounts[1]);
    console.log(fromTokens(balanceBuyer));

    let balanceMaker = await web3.eth.getBalance(accounts[0]);
    console.log(fromTokens(balanceMaker));

    let [account_1_erc1155_balance] = await Promise.all([
      erc1155.balanceOf(accounts[1], nfts[0]),
    ]);

    assert.equal(
      account_1_erc1155_balance.toNumber(),
      fillCount,
      "Incorrect ERC1155 balance"
    );
  });

  it("matches erc721-erc20 no checks order", async () => {
    const alice = accounts[0];
    const bob = accounts[1];

    const { exchange, registry, statici } = await withContracts();
    const [erc20, erc721] = await deploy([TestERC20, TestERC721]);

    const aliceProxy = await registry.proxies(alice);
    assert.equal(true, aliceProxy.length > 0, "No proxy address for Alice");

    const bobProxy = await registry.proxies(bob);
    assert.equal(true, bobProxy.length > 0, "No proxy address for Bob");

    const amount = 1000;
    const tokenId = 100;

    await Promise.all([erc20.mint(bob, amount), erc721.mint(alice, tokenId)]);

    await Promise.all([
      erc20.approve(bobProxy, amount, { from: bob }),
      erc721.setApprovalForAll(aliceProxy, true, { from: alice }),
    ]);

    const erc20c = new web3.eth.Contract(erc20.abi, erc20.address);
    const erc721c = new web3.eth.Contract(erc721.abi, erc721.address);

    const selector = web3.eth.abi.encodeFunctionSignature(
      "any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );

    const one = {
      registry: registry.address,
      maker: accounts[0],
      staticTarget: statici.address,
      staticSelector: selector,
      staticExtradata: "0x",
      maximumFill: "1",
      listingTime: "0",
      expirationTime: "100000000000",
      salt: "2334",
    };

    const two = {
      registry: registry.address,
      maker: accounts[1],
      staticTarget: statici.address,
      staticSelector: selector,
      staticExtradata: "0x",
      maximumFill: amount,
      listingTime: "0",
      expirationTime: "100000000000",
      salt: "2335",
    };

    const firstData = erc721c.methods
      .transferFrom(alice, bob, tokenId)
      .encodeABI();

    const firstCall = { target: erc721.address, howToCall: 0, data: firstData };

    const secondData = erc20c.methods
      .transferFrom(bob, alice, amount)
      .encodeABI();

    const secondCall = {
      target: erc20.address,
      howToCall: 0,
      data: secondData,
    };

    let sigOne = await exchange.sign(one, accounts[0]);
    let sigTwo = await exchange.sign(two, accounts[1]);
    await exchange.atomicMatch(
      one,
      sigOne,
      firstCall,
      two,
      sigTwo,
      secondCall,
      ZERO_BYTES32
    );
    assert.equal(await erc20.balanceOf(alice), amount, "Balance mismatch");
    assert.equal(await erc721.ownerOf(tokenId), bob, "Incorrect owner");
  });

  it("erc721 <> erc20 with checks no fees", async () => {
    const alice = accounts[0];
    const bob = accounts[1];
    const carol = accounts[2];

    const { atomicizer, exchange, registry, statici } = await withContracts();
    const [erc20, erc721] = await deploy([TestERC20, TestERC721]);

    const atomicizerc = new web3.eth.Contract(
      atomicizer.abi,
      atomicizer.address
    );

    const aliceProxy = await registry.proxies(alice);
    assert.equal(true, aliceProxy.length > 0, "No proxy address for Alice");

    const bobProxy = await registry.proxies(bob);
    assert.equal(true, bobProxy.length > 0, "No proxy address for Bob");

    const amount = 1000;
    const tokenId = 101;

    await Promise.all([erc20.mint(bob, amount), erc721.mint(alice, tokenId)]);

    await Promise.all([
      erc20.approve(bobProxy, amount, { from: bob }),
      erc721.setApprovalForAll(aliceProxy, true, { from: alice }),
    ]);

    const erc20c = new web3.eth.Contract(erc20.abi, erc20.address);
    const erc721c = new web3.eth.Contract(erc721.abi, erc721.address);

    let selectorOne, extradataOne;
    {
      const selector = web3.eth.abi.encodeFunctionSignature(
        "split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );
      // Call should be an ERC721 transfer
      const selectorCall = web3.eth.abi.encodeFunctionSignature(
        "transferERC721Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const extradataCall = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc721.address, tokenId]
      );
      // Countercall should include an ERC20 transfer
      const selectorCountercall = web3.eth.abi.encodeFunctionSignature(
        "sequenceAnyAfter(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const countercallSelector1 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const countercallExtradata1 = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc20.address, amount]
      );
      const extradataCountercall = web3.eth.abi.encodeParameters(
        ["address[]", "uint256[]", "bytes4[]", "bytes"],
        [
          [statici.address],
          [(countercallExtradata1.length - 2) / 2],
          [countercallSelector1],
          countercallExtradata1,
        ]
      );

      const params = web3.eth.abi.encodeParameters(
        ["address[2]", "bytes4[2]", "bytes", "bytes"],
        [
          [statici.address, statici.address],
          [selectorCall, selectorCountercall],
          extradataCall,
          extradataCountercall,
        ]
      );

      selectorOne = selector;
      extradataOne = params;
    }

    const one = {
      registry: registry.address,
      maker: alice,
      staticTarget: statici.address,
      staticSelector: selectorOne,
      staticExtradata: extradataOne,
      maximumFill: 1,
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "15",
    };
    const sigOne = await exchange.sign(one, alice);

    let selectorTwo, extradataTwo;
    {
      const selector = web3.eth.abi.encodeFunctionSignature(
        "split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );
      // Call should be an ERC20 transfer to recipient + fees
      const selectorCall = web3.eth.abi.encodeFunctionSignature(
        "sequenceExact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callSelector1 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata1 = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc20.address, amount]
      );
      const extradataCall = web3.eth.abi.encodeParameters(
        ["address[]", "uint256[]", "bytes4[]", "bytes"],
        [
          [statici.address],
          [(callExtradata1.length - 2) / 2],
          [callSelector1],
          callExtradata1,
        ]
      );
      // Countercall should be an ERC721 transfer
      const selectorCountercall = web3.eth.abi.encodeFunctionSignature(
        "transferERC721Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const extradataCountercall = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc721.address, tokenId]
      );

      const params = web3.eth.abi.encodeParameters(
        ["address[2]", "bytes4[2]", "bytes", "bytes"],
        [
          [statici.address, statici.address],
          [selectorCall, selectorCountercall],
          extradataCall,
          extradataCountercall,
        ]
      );

      selectorTwo = selector;
      extradataTwo = params;
    }

    const two = {
      registry: registry.address,
      maker: bob,
      staticTarget: statici.address,
      staticSelector: selectorTwo,
      staticExtradata: extradataTwo,
      maximumFill: amount,
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "16",
    };
    const sigTwo = await exchange.sign(two, bob);

    const firstData = erc721c.methods
      .transferFrom(alice, bob, tokenId)
      .encodeABI();

    const c1 = erc20c.methods.transferFrom(bob, alice, amount).encodeABI();
    const secondData = atomicizerc.methods
      .atomicize([erc20.address], [0], [(c1.length - 2) / 2], c1)
      .encodeABI();

    const firstCall = { target: erc721.address, howToCall: 0, data: firstData };
    const secondCall = {
      target: atomicizer.address,
      howToCall: 1,
      data: secondData,
    };

    await exchange.atomicMatchWith(
      one,
      sigOne,
      firstCall,
      two,
      sigTwo,
      secondCall,
      ZERO_BYTES32,
      { from: carol }
    );

    const [aliceErc20Balance, tokenIdOwner] = await Promise.all([
      erc20.balanceOf(alice),
      erc721.ownerOf(tokenId),
    ]);
    assert.equal(
      aliceErc20Balance.toNumber(),
      amount + 1000,
      "Incorrect ERC20 balance"
    );
    assert.equal(tokenIdOwner, bob, "Incorrect token owner");
  });

  it("erc721 <> erc20 with checks and fees", async () => {
    const alice = accounts[0];
    const bob = accounts[1];
    const carol = accounts[2];
    const david = accounts[3];

    const { atomicizer, exchange, registry, statici } = await withContracts();
    const [erc20, erc721] = await deploy([TestERC20, TestERC721]);

    const atomicizerc = new web3.eth.Contract(
      atomicizer.abi,
      atomicizer.address
    );

    const aliceProxy = await registry.proxies(alice);
    assert.equal(true, aliceProxy.length > 0, "No proxy address for Alice");

    const bobProxy = await registry.proxies(bob);
    assert.equal(true, bobProxy.length > 0, "No proxy address for Bob");

    const amount = 1000;
    const fee1 = 10;
    const fee2 = 20;
    const tokenId = 0;

    await Promise.all([
      erc20.mint(bob, amount + fee1 + fee2),
      erc721.mint(alice, tokenId),
    ]);

    await Promise.all([
      erc20.approve(bobProxy, amount + fee1 + fee2, { from: bob }),
      erc721.setApprovalForAll(aliceProxy, true, { from: alice }),
    ]);

    const erc20c = new web3.eth.Contract(erc20.abi, erc20.address);
    const erc721c = new web3.eth.Contract(erc721.abi, erc721.address);

    const anySelector = web3.eth.abi.encodeFunctionSignature(
      "any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );

    let selectorOne, extradataOne;
    {
      const selector = web3.eth.abi.encodeFunctionSignature(
        "split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );
      // Call should be an ERC721 transfer
      const selectorCall = web3.eth.abi.encodeFunctionSignature(
        "transferERC721Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const extradataCall = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc721.address, tokenId]
      );
      // Countercall should include an ERC20 transfer
      const selectorCountercall = web3.eth.abi.encodeFunctionSignature(
        "sequenceAnyAfter(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const countercallSelector1 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const countercallExtradata1 = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc20.address, amount]
      );
      const extradataCountercall = web3.eth.abi.encodeParameters(
        ["address[]", "uint256[]", "bytes4[]", "bytes"],
        [
          [statici.address],
          [(countercallExtradata1.length - 2) / 2],
          [countercallSelector1],
          countercallExtradata1,
        ]
      );

      const params = web3.eth.abi.encodeParameters(
        ["address[2]", "bytes4[2]", "bytes", "bytes"],
        [
          [statici.address, statici.address],
          [selectorCall, selectorCountercall],
          extradataCall,
          extradataCountercall,
        ]
      );

      selectorOne = selector;
      extradataOne = params;
    }

    const one = {
      registry: registry.address,
      maker: alice,
      staticTarget: statici.address,
      staticSelector: selectorOne,
      staticExtradata: extradataOne,
      maximumFill: 1,
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "11",
    };
    const sigOne = await exchange.sign(one, alice);

    let selectorTwo, extradataTwo;
    {
      const selector = web3.eth.abi.encodeFunctionSignature(
        "split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );
      // Call should be an ERC20 transfer to recipient + fees
      const selectorCall = web3.eth.abi.encodeFunctionSignature(
        "sequenceExact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callSelector1 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata1 = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc20.address, amount]
      );
      const callSelector2 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20ExactTo(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata2 = web3.eth.abi.encodeParameters(
        ["address", "uint256", "address"],
        [erc20.address, fee1, carol]
      );
      const callSelector3 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20ExactTo(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata3 = web3.eth.abi.encodeParameters(
        ["address", "uint256", "address"],
        [erc20.address, fee2, david]
      );
      const extradataCall = web3.eth.abi.encodeParameters(
        ["address[]", "uint256[]", "bytes4[]", "bytes"],
        [
          [statici.address, statici.address, statici.address],
          [
            (callExtradata1.length - 2) / 2,
            (callExtradata2.length - 2) / 2,
            (callExtradata3.length - 2) / 2,
          ],
          [callSelector1, callSelector2, callSelector3],
          callExtradata1 +
            callExtradata2.slice("2") +
            callExtradata3.slice("2"),
        ]
      );
      // Countercall should be an ERC721 transfer
      const selectorCountercall = web3.eth.abi.encodeFunctionSignature(
        "transferERC721Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const extradataCountercall = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc721.address, tokenId]
      );

      const params = web3.eth.abi.encodeParameters(
        ["address[2]", "bytes4[2]", "bytes", "bytes"],
        [
          [statici.address, statici.address],
          [selectorCall, selectorCountercall],
          extradataCall,
          extradataCountercall,
        ]
      );

      selectorTwo = selector;
      extradataTwo = params;
    }

    const two = {
      registry: registry.address,
      maker: bob,
      staticTarget: statici.address,
      staticSelector: anySelector,
      staticExtradata: extradataTwo,
      maximumFill: amount,
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "12",
    };
    const sigTwo = await exchange.sign(two, bob);

    const firstData = erc721c.methods
      .transferFrom(alice, bob, tokenId)
      .encodeABI();

    const c1 = erc20c.methods.transferFrom(bob, alice, amount).encodeABI();
    const c2 = erc20c.methods.transferFrom(bob, carol, fee1).encodeABI();
    const c3 = erc20c.methods.transferFrom(bob, david, fee2).encodeABI();
    const secondData = atomicizerc.methods
      .atomicize(
        [erc20.address, erc20.address, erc20.address],
        [0, 0, 0],
        [(c1.length - 2) / 2, (c2.length - 2) / 2, (c3.length - 2) / 2],
        c1 + c2.slice("2") + c3.slice("2")
      )
      .encodeABI();

    const firstCall = { target: erc721.address, howToCall: 0, data: firstData };
    const secondCall = {
      target: atomicizer.address,
      howToCall: 1,
      data: secondData,
    };

    let tx = await exchange.atomicMatchWith(
      one,
      sigOne,
      firstCall,
      two,
      sigTwo,
      secondCall,
      ZERO_BYTES32,
      { from: carol }
    );

    const [
      aliceErc20Balance,
      carolErc20Balance,
      davidErc20Balance,
      tokenIdOwner,
    ] = await Promise.all([
      erc20.balanceOf(alice),
      erc20.balanceOf(carol),
      erc20.balanceOf(david),
      erc721.ownerOf(tokenId),
    ]);
    assert.equal(
      aliceErc20Balance.toNumber(),
      amount + 2000,
      "Incorrect ERC20 balance"
    );
    assert.equal(carolErc20Balance.toNumber(), fee1, "Incorrect ERC20 balance");
    assert.equal(davidErc20Balance.toNumber(), fee2, "Incorrect ERC20 balance");
    assert.equal(tokenIdOwner, bob, "Incorrect token owner");

    console.log(tx);
  });

  it("matches erc1155 <> erc20 order, partial fills in 1 transaction with fees using atomiczer calldata", async () => {
    let eddy = accounts[5];
    let sam = accounts[6];
    let carol = accounts[7];
    let david = accounts[8];

    let price = 1000;
    let fee1 = 20;
    let fee2 = 40;
    let tokenId = 4;

    maximumFill = 1;

    fillCount = 1;

    txCount = 1;

    let { atomicizer, exchange, registry, statici } = await withContracts();
    let [erc20, erc1155] = await deploy([TestERC20, TestERC1155]);

    await registry.registerProxy({ from: eddy });
    let proxy1 = await registry.proxies(eddy);
    assert.equal(true, proxy1.length > 0, "no proxy address for account a");

    await registry.registerProxy({ from: sam });
    let proxy2 = await registry.proxies(sam);
    assert.equal(true, proxy2.length > 0, "no proxy address for account b");

    await Promise.all([
      erc1155.setApprovalForAll(proxy1, true, { from: eddy }),
      erc20.approve(proxy2, fillCount * (price + fee1 + fee2), { from: sam }),
    ]);
    await Promise.all([
      erc1155.mint(eddy, tokenId, maximumFill),
      erc20.mint(sam, fillCount * (price + fee1 + fee2)),
    ]);

    const atomicizerc = new web3.eth.Contract(
      atomicizer.abi,
      atomicizer.address
    );

    const erc1155c = new web3.eth.Contract(erc1155.abi, erc1155.address);
    const erc20c = new web3.eth.Contract(erc20.abi, erc20.address);
    const selectorOne = web3.eth.abi.encodeFunctionSignature(
      "anyERC1155FforMultiERC20Calls(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );

    const anySelector = web3.eth.abi.encodeFunctionSignature(
      "any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );

    const paramsOne = web3.eth.abi.encodeParameters(
      ["address[2]", "uint256[3]"],
      [
        [erc1155.address, erc20.address],
        [tokenId, 1, price],
      ]
    );

    const paramsTwo = web3.eth.abi.encodeParameters(
      ["address[]", "uint256[]"],
      [
        [erc20.address, erc1155.address, carol, david],
        [tokenId, price, 1, fee1, fee2],
      ]
    );

    const one = {
      registry: registry.address,
      maker: eddy,
      staticTarget: statici.address,
      staticSelector: anySelector,
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
      staticSelector: selectorOne,
      staticExtradata: paramsTwo,
      maximumFill: price * fillCount,
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "12",
    };

    const firstData = erc1155c.methods
      .safeTransferFrom(eddy, sam, tokenId, fillCount, "0x")
      .encodeABI();

    const c1 = erc20c.methods.transferFrom(sam, eddy, price).encodeABI();
    const c2 = erc20c.methods.transferFrom(sam, carol, fee1).encodeABI();
    const c3 = erc20c.methods.transferFrom(sam, david, fee2).encodeABI();
    const secondData = atomicizerc.methods
      .atomicize(
        [erc20.address, erc20.address, erc20.address],
        [0, 0, 0],
        [(c1.length - 2) / 2, (c2.length - 2) / 2, (c3.length - 2) / 2],
        c1 + c2.slice("2") + c3.slice("2")
      )
      .encodeABI();

    const firstCall = {
      target: erc1155.address,
      howToCall: 0,
      data: firstData,
    };
    const secondCall = {
      target: atomicizer.address,
      howToCall: 1,
      data: secondData,
    };

    let sigOne = await exchange.sign(one, eddy);

    for (var i = 0; i < txCount; ++i) {
      let sigTwo = await exchange.sign(two, sam);
      let tx = await exchange.atomicMatchWith(
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
      let ev = checkEventEmitted(tx, "OrdersMatched");
      let secondFill = ev.args["secondFill"];
      console.log(secondFill);
      console.log(tx);
    }

    const [
      eddyErc20Balance,
      carolErc20Balance,
      davidErc20Balance,
      tokenIdOwnerBalance,
    ] = await Promise.all([
      erc20.balanceOf(eddy),
      erc20.balanceOf(carol),
      erc20.balanceOf(david),
      erc1155.balanceOf(sam, tokenId),
    ]);
    assert.equal(eddyErc20Balance.toNumber(), price, "Incorrect ERC20 balance");
    assert.equal(carolErc20Balance.toNumber(), fee1, "Incorrect ERC20 balance");
    assert.equal(davidErc20Balance.toNumber(), fee2, "Incorrect ERC20 balance");
    assert.equal(tokenIdOwnerBalance, fillCount, "Incorrect owner balance");
  });

  it("matches erc1155 <> erc20 order, partial fills in 1 transaction with fees", async () => {
    let eddy = accounts[5];
    let sam = accounts[6];
    let protocolWallet = accounts[3];
    let creatorWallet = accounts[8];

    let price = 1000;
    let protocolFee = 2;
    let creatorFee = 5;
    let tokenId = 9;

    maximumFill = 1;

    fillCount = 1;

    txCount = 1;

    let protocolAmount = (price * protocolFee * fillCount) / 100;
    let creatorAmount = (price * creatorFee * fillCount) / 100;
    let sellerAmount = price * fillCount - (protocolAmount + creatorAmount);

    let { atomicizer, exchange, registry, statici } = await withContracts();
    let [erc20, erc1155] = await deploy([TestERC20, TestERC1155]);

    const atomicizerc = new web3.eth.Contract(
      atomicizer.abi,
      atomicizer.address
    );

    let proxy1 = await registry.proxies(eddy);
    assert.equal(true, proxy1.length > 0, "no proxy address for account a");

    let proxy2 = await registry.proxies(sam);
    assert.equal(true, proxy2.length > 0, "no proxy address for account b");

    await Promise.all([
      erc1155.setApprovalForAll(proxy1, true, { from: eddy }),
      erc20.approve(proxy2, fillCount * price, { from: sam }),
    ]);
    await Promise.all([
      erc1155.mint(eddy, tokenId, maximumFill),
      erc20.mint(sam, fillCount * price),
    ]);

    const erc1155c = new web3.eth.Contract(erc1155.abi, erc1155.address);
    const erc20c = new web3.eth.Contract(erc20.abi, erc20.address);
    const selectorOne = web3.eth.abi.encodeFunctionSignature(
      "anyERC1155ForERC20(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );
    const selectorTwo = web3.eth.abi.encodeFunctionSignature(
      "anyERC20ForERC1155(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );

    const selector = web3.eth.abi.encodeFunctionSignature(
      "any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );

    const paramsOne = web3.eth.abi.encodeParameters(
      ["address[2]", "uint256[3]"],
      [
        [erc1155.address, erc20.address],
        [tokenId, 1, sellerAmount],
      ]
    );

    const paramsTwo = web3.eth.abi.encodeParameters(
      ["address[2]", "uint256[3]"],
      [
        [erc20.address, erc1155.address],
        [tokenId, sellerAmount, 1],
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
    const firstData = erc1155c.methods
      .safeTransferFrom(eddy, sam, tokenId, fillCount, "0x")
      .encodeABI();

    const firstCall = {
      target: erc1155.address,
      howToCall: 0,
      data: firstData,
    };
    const c1 = erc20c.methods.transferFrom(sam, eddy, sellerAmount).encodeABI();
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

    // let sigTwo = await exchange.sign(two, sam);

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
        erc1155.balanceOf(sam, tokenId),
      ]);
    assert.equal(
      eddy_balance.toNumber(),
      sellerAmount + 1000,
      "Incorrect ERC20 balance"
    );
    assert.equal(
      protocol_balance.toNumber(),
      protocolAmount + 20,
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

  it("matches erc1155 <> erc20, partial fills in 1 transaction with checks and fees", async () => {
    const alice = accounts[0];
    const bob = accounts[1];
    const carol = accounts[2];
    const david = accounts[3];

    const { atomicizer, exchange, registry, statici, erc20, erc1155 } =
      await withContracts();

    const atomicizerc = new web3.eth.Contract(
      atomicizer.abi,
      atomicizer.address
    );

    const aliceProxy = await registry.proxies(alice);
    assert.equal(true, aliceProxy.length > 0, "No proxy address for Alice");

    const bobProxy = await registry.proxies(bob);
    assert.equal(true, bobProxy.length > 0, "No proxy address for Bob");

    const amount = 60000;
    // const protocolFee = 2;
    const royaltyFee = 5;

    let protocolAmount;

    const tokenId = 11;

    let fillCount = 1;

    let txCount = 1;

    let stack = [];

    maximumFill = 1;

    const { maxRange, minRange, maxFee, minFee, slope, constant } =
      getProtocolFeeStruct(200, 100, 50000, 20000);

    if (amount * fillCount > 0 && amount * fillCount < fromWei(minRange)) {
      protocolAmount = (amount * maxFee * fillCount) / 10000;
    }
    if (
      amount * fillCount >= fromWei(minRange) &&
      amount * fillCount <= fromWei(maxRange)
    ) {
      protocolAmount =
        (amount * ((fromWei(constant + "") - amount) / fromWei(slope + ""))) /
        10000;
    }
    if (amount * fillCount >= fromWei(maxRange)) {
      protocolAmount = (amount * minFee * fillCount) / 10000;
    }

    let creatorAmount = (amount * royaltyFee * fillCount) / 100;
    let sellerAmount = amount * fillCount - (protocolAmount + creatorAmount);
    let totalAmount = protocolAmount + creatorAmount + sellerAmount;

    await Promise.all([
      erc20.mint(bob, totalAmount),
      erc1155.mint(alice, tokenId),
    ]);

    await Promise.all([
      erc20.approve(bobProxy, totalAmount, {
        from: bob,
      }),
      erc1155.setApprovalForAll(aliceProxy, true, { from: alice }),
    ]);

    const erc20c = new web3.eth.Contract(erc20.abi, erc20.address);
    const erc1155c = new web3.eth.Contract(erc1155.abi, erc1155.address);

    const anySelector = web3.eth.abi.encodeFunctionSignature(
      "any(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
    );

    let selectorOne, extradataOne;
    {
      const selector = web3.eth.abi.encodeFunctionSignature(
        "split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );
      // Call should be an ERC721 transfer
      const selectorCall = web3.eth.abi.encodeFunctionSignature(
        "transferERC1155Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const extradataCall = web3.eth.abi.encodeParameters(
        ["address", "uint256", "uint256"],
        [erc1155.address, tokenId, fillCount]
      );
      // Countercall should include an ERC20 transfer
      const selectorCountercall = web3.eth.abi.encodeFunctionSignature(
        "sequenceAnyAfter(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const countercallSelector1 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const countercallExtradata1 = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc20.address, sellerAmount]
      );
      const extradataCountercall = web3.eth.abi.encodeParameters(
        ["address[]", "uint256[]", "bytes4[]", "bytes"],
        [
          [statici.address],
          [(countercallExtradata1.length - 2) / 2],
          [countercallSelector1],
          countercallExtradata1,
        ]
      );

      const params = web3.eth.abi.encodeParameters(
        ["address[2]", "bytes4[2]", "bytes", "bytes"],
        [
          [statici.address, statici.address],
          [selectorCall, selectorCountercall],
          extradataCall,
          extradataCountercall,
        ]
      );

      selectorOne = selector;
      extradataOne = params;
    }

    const one = {
      registry: registry.address,
      maker: alice,
      staticTarget: statici.address,
      staticSelector: selectorOne,
      staticExtradata: extradataOne,
      maximumFill: 1,
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "11",
    };

    const sigOne = await exchange.sign(one, alice);

    let selectorTwo, extradataTwo;
    {
      const selector = web3.eth.abi.encodeFunctionSignature(
        "split(bytes,address[7],uint8[2],uint256[6],bytes,bytes)"
      );
      // Call should be an ERC20 transfer to recipient + fees
      const selectorCall = web3.eth.abi.encodeFunctionSignature(
        "sequenceExact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callSelector1 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata1 = web3.eth.abi.encodeParameters(
        ["address", "uint256"],
        [erc20.address, sellerAmount]
      );
      const callSelector2 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20ExactTo(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata2 = web3.eth.abi.encodeParameters(
        ["address", "uint256", "address"],
        [erc20.address, protocolAmount, carol]
      );
      const callSelector3 = web3.eth.abi.encodeFunctionSignature(
        "transferERC20ExactTo(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const callExtradata3 = web3.eth.abi.encodeParameters(
        ["address", "uint256", "address"],
        [erc20.address, creatorAmount, david]
      );
      const extradataCall = web3.eth.abi.encodeParameters(
        ["address[]", "uint256[]", "bytes4[]", "bytes"],
        [
          [statici.address, statici.address, statici.address],
          [
            (callExtradata1.length - 2) / 2,
            (callExtradata2.length - 2) / 2,
            (callExtradata3.length - 2) / 2,
          ],
          [callSelector1, callSelector2, callSelector3],
          callExtradata1 +
            callExtradata2.slice("2") +
            callExtradata3.slice("2"),
        ]
      );
      // Countercall should be an ERC721 transfer
      const selectorCountercall = web3.eth.abi.encodeFunctionSignature(
        "transferERC1155Exact(bytes,address[7],uint8,uint256[6],bytes)"
      );
      const extradataCountercall = web3.eth.abi.encodeParameters(
        ["address", "uint256", "uint256"],
        [erc1155.address, tokenId, fillCount]
      );

      const params = web3.eth.abi.encodeParameters(
        ["address[2]", "bytes4[2]", "bytes", "bytes"],
        [
          [statici.address, statici.address],
          [selectorCall, selectorCountercall],
          extradataCall,
          extradataCountercall,
        ]
      );

      selectorTwo = selector;
      extradataTwo = params;
    }

    const two = {
      registry: registry.address,
      maker: bob,
      staticTarget: statici.address,
      staticSelector: selectorTwo,
      staticExtradata: extradataTwo,
      maximumFill: amount,
      listingTime: "0",
      expirationTime: "10000000000",
      salt: "12",
    };

    const firstData = erc1155c.methods
      .safeTransferFrom(alice, bob, tokenId, fillCount, "0x")
      .encodeABI();

    const c1 = erc20c.methods
      .transferFrom(bob, alice, sellerAmount)
      .encodeABI();
    const c2 = erc20c.methods
      .transferFrom(bob, carol, protocolAmount)
      .encodeABI();
    const c3 = erc20c.methods
      .transferFrom(bob, david, creatorAmount)
      .encodeABI();
    const secondData = atomicizerc.methods
      .atomicize(
        [erc20.address, erc20.address, erc20.address],
        [0, 0, 0],
        [(c1.length - 2) / 2, (c2.length - 2) / 2, (c3.length - 2) / 2],
        c1 + c2.slice("2") + c3.slice("2")
      )
      .encodeABI();

    const firstCall = {
      target: erc1155.address,
      howToCall: 0,
      data: firstData,
    };
    const secondCall = {
      target: atomicizer.address,
      howToCall: 1,
      data: secondData,
    };

    for (var i = 0; i < txCount; ++i) {
      const sigTwo = await exchange.sign(two, bob);
      let tx = await exchange.atomicMatchWith(
        one,
        sigOne,
        firstCall,
        two,
        sigTwo,
        secondCall,
        ZERO_BYTES32,
        { from: alice }
      );
      two.salt++;
      stack.push(tx);
    }

    const [
      aliceErc20Balance,
      carolErc20Balance,
      davidErc20Balance,
      tokenIdOwnerBalance,
    ] = await Promise.all([
      erc20.balanceOf(alice),
      erc20.balanceOf(carol),
      erc20.balanceOf(david),
      erc1155.balanceOf(bob, tokenId),
    ]);

    console.log(carolErc20Balance.toNumber());
    assert.equal(
      aliceErc20Balance.toNumber(),
      sellerAmount,
      "Incorrect ERC20 balance"
    );
    assert.equal(
      carolErc20Balance.toNumber(),
      protocolAmount,
      "Incorrect ERC20 balance"
    );
    assert.equal(
      davidErc20Balance.toNumber(),
      creatorAmount,
      "Incorrect ERC20 balance"
    );
    assert.equal(tokenIdOwnerBalance, fillCount, "Incorrect owner balance");

    console.log(stack[0]);
  });
});
