const Sale = artifacts.require(`./Sale.sol`);
const Token = artifacts.require(`./HumanStandardToken.sol`);
const fs = require(`fs`);

module.exports = function(deployer, network, accounts) {
    const saleConf = JSON.parse(fs.readFileSync(`./conf/sale.json`));
    if(network === `development`) {
      saleConf.owner = accounts[0];
      saleConf.wallet = accounts[1];
    }

    deployer.deploy(Sale,
      saleConf.owner,
      saleConf.wallet,
      Token.address,
      saleConf.price,
      saleConf.startBlock
    );
};
