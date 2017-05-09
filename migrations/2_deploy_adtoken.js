const Token = artifacts.require(`./HumanStandardToken.sol`);
const fs = require(`fs`);

module.exports = function(deployer) {
    const tokenConf = JSON.parse(fs.readFileSync(`./conf/token.json`));
    deployer.deploy(Token,
      tokenConf.initialAmount,
      tokenConf.tokenName,
      tokenConf.decimalUnits,
      tokenConf.tokenSymbol
    );
};
