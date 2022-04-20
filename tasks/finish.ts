import { task } from 'hardhat/config';
import { DAO } from '../typechain';

task('finish', 'Finish proposal')
  .addParam('contract', 'DAO Contract address')
  .addParam('id', 'Proposal ID')
  .setAction(async (taskArgs, hre) => {
    const { contract, id } = taskArgs;
    const dao: DAO = await hre.ethers.getContractAt('DAO', contract);

    const tx = await dao.finishProposal(id);
    await tx.wait();
  });
