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

module.exports = (deployer) => {
  const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
  const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));
  const preBuyersConf = JSON.parse(fs.readFileSync('./conf/preBuyers.json'));
  const foundersConf = JSON.parse(fs.readFileSync('./conf/founders.json'));

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
