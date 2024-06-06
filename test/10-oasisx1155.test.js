const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

// chai assert
const { assert } = chai;

// chai promises
chai.use(chaiAsPromised);

// utils
const { toTokens } = require("../utils/test-utils")(web3);

// file system
const fs = require("fs");

// hashing function
const keccak256 = require("keccak256");

// load contract artifact
const oasis1155 = artifacts.require("OasisX1155");

// load migration-parameters
const conf = require("../migration-parameters.js");

contract("OasisX1155", ([owner, user1, user2, user3]) => {
  let oasisx1155;
  const c = conf.devnet.oasisnft;
  let txStack = [];

  it("is deployed", async () => {
    oasisx1155 = await oasis1155.deployed();
  });

  // Check name and symbol
  it("Proxy: Name is OasisX NFT collection and symbol is OasisXNFT", async () => {
    let name = await oasisx1155.name();
    let symbol = await oasisx1155.symbol();
    assert.equal(name, c.name);
    assert.equal(symbol, c.symbol);
  });

  // Check minting costs
  it("Check mint Price for different tokenIds", async () => {
    let mintPrice1 = await oasisx1155.mintPrice(0);
    let mintPrice2 = await oasisx1155.mintPrice(1);
    let mintPrice3 = await oasisx1155.mintPrice(2);

    assert.equal(mintPrice1, c.mintCostPerTokenId[0]);
    assert.equal(mintPrice2, c.mintCostPerTokenId[1]);
    assert.equal(mintPrice3, c.mintCostPerTokenId[2]);
  });

  // attempts admin mint
  it("Admin can mint", async () => {
    let tx = await oasisx1155.adminMint(owner, 1, 2, { from: owner });
    let balance = await oasisx1155.balanceOf(owner, 1);
    assert.equal(balance, 2);
    txStack.push(tx);
  });

  // Any user can mint
  it("Any user can mint during Public sale", async () => {
    let tx = await oasisx1155.mint(user1, 2, 2, {
      from: user1,
      value: toTokens("0.1"),
    });
    let balance = await oasisx1155.balanceOf(user1, 2);
    assert.equal(balance, 2);
    txStack.push(tx);
  });

  // Change minting price
  it("Changing the minting price", async () => {
    let tx = await oasisx1155.changeMintCost(toTokens("0.1"), 1, {
      from: owner,
    });
    let mintPrice = await oasisx1155.mintPrice(1);
    assert.equal(mintPrice, toTokens("0.1"));
    txStack.push(tx);
  });

  //Any user can mint after change of mint price
  it("Any user can mint after mint price change", async () => {
    let tx = await oasisx1155.mint(user2, 1, 1, {
      from: user2,
      value: toTokens("0.1"),
    });
    let balance = await oasisx1155.balanceOf(user2, 1);
    assert.equal(balance, 1);
    txStack.push(tx);
  });

  // Minted NFTs transfer
  it("User can transfer minted NFTs", async () => {
    let tx = await oasisx1155.transferFrom(
      user2,
      user1,
      1,
      1,
      web3.utils.fromAscii(""),
      { from: user2 }
    );
    let balance = await oasisx1155.balanceOf(user1, 1);
    assert.equal(balance, 1);
    txStack.push(tx);
  });

  // Add token Ids with respective mint price
  it("Owner can add tokenIds and mint price", async () => {
    let tx = await oasisx1155.incrementMaxId(toTokens("0.3"));
    txStack.push(tx);
  });
});
