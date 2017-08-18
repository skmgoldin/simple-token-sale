/* global artifacts */

const Sale = artifacts.require('./Sale.sol');
const fs = require('fs');
const BN = require('bn.js');

const distributePreBuyersTokens = async function distributePreBuyersTokens(addresses, tokens) {
  const BATCHSIZE = 30;
  if (addresses.length !== tokens.length) {
    throw new Error('The number of pre-buyers and pre-buyer token allocations do not match');
  }

  const addressesChunk = addresses.slice(0, BATCHSIZE);
  const tokensChunk = tokens.slice(0, BATCHSIZE);
  const sale = await Sale.deployed();
  await sale.distributePreBuyersRewards(addressesChunk, tokensChunk);
  console.log(`Distributed tokens to a batch of ${addressesChunk.length} pre-buyers`);

  if (addresses.length <= BATCHSIZE) {
    return addressesChunk;
  }

  return addressesChunk.concat(await distributePreBuyersTokens(
    addresses.slice(BATCHSIZE),
    tokens.slice(BATCHSIZE),
  ));
};

module.exports = (deployer, network, accounts) => {
  let saleConf;
  let tokenConf;
  let preBuyersConf;
  let foundersConf;

  if (network === 'development') {
    saleConf = JSON.parse(fs.readFileSync('./conf/testSale.json'));
    tokenConf = JSON.parse(fs.readFileSync('./conf/testToken.json'));
    preBuyersConf = JSON.parse(fs.readFileSync('./conf/testPreBuyers.json'));
    foundersConf = JSON.parse(fs.readFileSync('./conf/testFounders.json'));

    saleConf.owner = accounts[0];
    fs.writeFileSync('./conf/testSale.json', JSON.stringify(saleConf, null, '  '));

    const pad = 10; // We use addresses from 0-3 for actors in the tests.
    Object.keys(foundersConf.founders).map((curr, i) => {
      foundersConf.founders[curr].address = accounts[i + pad];
      return undefined;
    });
    fs.writeFileSync('./conf/testFounders.json', JSON.stringify(foundersConf, null, '  '));
  } else {
    saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
    tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));
    preBuyersConf = JSON.parse(fs.readFileSync('./conf/preBuyers.json'));
    foundersConf = JSON.parse(fs.readFileSync('./conf/founders.json'));
  }

  const preBuyers = Object.keys(preBuyersConf).map(preBuyer => preBuyersConf[preBuyer].address);
  const preBuyersTokens = Object.keys(preBuyersConf).map(preBuyer =>
    new BN(preBuyersConf[preBuyer].amount, 10));

  const founders = Object.keys(foundersConf.founders).map(recipient =>
    foundersConf.founders[recipient].address);
  const foundersTokens = Object.keys(foundersConf.founders).map(recipient =>
    new BN(foundersConf.founders[recipient].amount, 10));

  const vestingDates = Object.keys(foundersConf.vestingDates).map(date =>
    foundersConf.vestingDates[date]);

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
    preBuyers.length,
  )
    .then(() => distributePreBuyersTokens(preBuyers, preBuyersTokens))
    .then(() => Sale.deployed())
    .then(sale => sale.distributeFoundersRewards(
      founders,
      foundersTokens,
      vestingDates,
    ));
};
