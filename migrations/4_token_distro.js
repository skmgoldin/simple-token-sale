const Sale = artifacts.require(`./Sale.sol`);
const Token = artifacts.require(`./HumanStandardToken.sol`);
const fs = require(`fs`);

module.exports = function(deployer, network, accounts) {
  const distros = JSON.parse(fs.readFileSync(`./conf/distros.json`));
  const transactions = [];

  for(const recipient in distros) {
    if(recipient === `publicSale`) {
      distros[recipient].address = Sale.address;
    }

    transactions.push(Promise.resolve(Token.deployed().then((instance) =>
      instance.transfer(distros[recipient].address, distros[recipient].amount)))
    );
  }

  Promise.all(transactions);
};
