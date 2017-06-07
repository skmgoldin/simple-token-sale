const Sale = artifacts.require(`./Sale.sol`);
const Token = artifacts.require(`./HumanStandardToken.sol`);
const fs = require(`fs`);
const BN = require(`bn.js`);

module.exports = function(deployer, network, accounts) {
    const saleConf = JSON.parse(fs.readFileSync(`./conf/sale.json`));
    const tokenConf = JSON.parse(fs.readFileSync(`./conf/token.json`));
    const distros = JSON.parse(fs.readFileSync(`./conf/distros.json`));

    if(network === `development`) {
      saleConf.owner = accounts[0];
      saleConf.wallet = `0x000000000000000000000000000000000000dead`;
      saleConf.prod = false;
      fs.writeFileSync(`./conf/sale.json`, JSON.stringify(saleConf, null, `  `));
    }

    if(network === `mainnet`) {
      if(saleConf.prod !== true) {
        throw new Error(`Sale conf file has prod flag set to false.`);
      }
    }

    const founders = [];
    const foundersTokens = [];
    for (recipient in distros) {
      if(distros[recipient].vestingDate === undefined) {
        founders.push(distros[recipient].address); 
        foundersTokens.push(new BN(distros[recipient].amount, 10)); 
      }
    }

    const timelockBeneficiaries = [];
    const beneficiaryTokens = [];
    const vestingDates = [];
    for (recipient in distros) {
      if(distros[recipient].vestingDate !== undefined) {
        timelockBeneficiaries.push(distros[recipient].address); 
        beneficiaryTokens.push(new BN(distros[recipient].amount, 10)); 
        vestingDates.push(new BN(distros[recipient].vestingDate, 10)); 
      }
    }

    return deployer.deploy(Sale,
      saleConf.owner,
      saleConf.wallet,
      tokenConf.initialAmount,
      tokenConf.tokenName,
      tokenConf.decimalUnits,
      tokenConf.tokenSymbol,
      saleConf.price,
      saleConf.startBlock,
      saleConf.freezeBlock,
      founders,
      foundersTokens,
      timelockBeneficiaries,
      beneficiaryTokens,
      vestingDates
    )
};
