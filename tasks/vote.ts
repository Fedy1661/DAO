import { task } from 'hardhat/config';
import { DAO } from '../typechain';
import { boolean } from 'hardhat/internal/core/params/argumentTypes';

task('vote', 'Cast your vote')
  .addParam('contract', 'DAO Contract address')
  .addParam('id', 'Proposal ID')
  .addParam('support', 'Support', undefined, boolean)
  .setAction(async (taskArgs, hre) => {
    const { contract, id, support } = taskArgs;
    const dao: DAO = await hre.ethers.getContractAt('DAO', contract);

    const tx = await dao.vote(id, support);
    await tx.wait();
  });
