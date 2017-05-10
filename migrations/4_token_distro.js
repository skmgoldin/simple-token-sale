const Sale = artifacts.require(`./Sale.sol`);
const Token = artifacts.require(`./HumanStandardToken.sol`);
const fs = require(`fs`);

module.exports = function(deployer, network, accounts) {
  const distros = JSON.parse(fs.readFileSync(`./conf/distros.json`));

  return Token.deployed()
  .then((instance) => instance.transfer(Sale.address, distros.publicSale));

};
