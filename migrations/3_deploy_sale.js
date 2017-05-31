const Sale = artifacts.require(`./Sale.sol`);
const Token = artifacts.require(`./HumanStandardToken.sol`);
const fs = require(`fs`);

module.exports = function(deployer, network, accounts) {
    const saleConf = JSON.parse(fs.readFileSync(`./conf/sale.json`));
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

    deployer.deploy(Sale,
      saleConf.owner,
      saleConf.wallet,
      Token.address,
      saleConf.price,
      saleConf.startBlock,
      saleConf.freezeBlock
    );
};
