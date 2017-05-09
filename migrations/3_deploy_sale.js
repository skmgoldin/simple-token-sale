const Sale = artifacts.require(`./Sale.sol`);
const Token = artifacts.require(`./HumanStandardToken.sol`);
const fs = require(`fs`);

module.exports = function(deployer) {
    const saleConf = JSON.parse(fs.readFileSync(`./conf/sale.json`));
    deployer.deploy(Sale,
      saleConf.owner,
      saleConf.wallet,
      Token.address,
      saleConf.price,
      saleConf.startBlock
    );
};
