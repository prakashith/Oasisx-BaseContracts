const oasisx1155Cont = artifacts.require("OasisX1155");
const oasisFactoryCont = artifacts.require("OasisXLaunchFactory");

const { loadNetworkConfig } = require("../utils/test-utils")(web3);
const conf = require("../migration-parameters.js");

module.exports = async (callback) => {
  try {
    // const network = config.network;
    const factory = await oasisFactoryCont.deployed();
    const oasisx1155 = await oasisx1155Cont.deployed();

    // let c = loadNetworkConfig(conf)[network]();
    let gasUsedTotal = 0;

    console.log(
      `Change OasisXFactory Address in OasisX1155 Contract : ${oasisx1155.address}`
    );
    const tx1 = await oasisx1155.changeFactoryAddress(factory.address);
    gasUsedTotal += tx1.receipt.cumulativeGasUsed;
    console.log("-------------------------------\n");

    console.log(
      "Changing Address cost in eth: ",
      (gasUsedTotal * 100) / 100000000
    );

    callback();
  } catch (e) {
    callback(e);
  }
};
