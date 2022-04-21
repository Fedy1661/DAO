import { ethers, network } from 'hardhat';
import chai, { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { DAO, Token } from '../typechain';
import { TokenInterface } from '../typechain/Token';

chai.use(require('chai-bignumber')());

async function increaseTime(time: number) {
  await network.provider.send('evm_increaseTime', [time]);
  await network.provider.send('evm_mine');
}

describe('DAO Contract', function () {
  let dao: DAO;
  let token: Token;
  let iToken: TokenInterface;
  let owner: SignerWithAddress;
  let chairperson: SignerWithAddress;
  let addr1: SignerWithAddress;
  let clean: string;

  const debatingPeriodDuration = 60 * 60 * 24 * 3;
  const minimumQuorum = 5000;

  before(async () => {
    [owner, chairperson, addr1] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('Token');
    token = await Token.deploy();
    const Dao = await ethers.getContractFactory('DAO');
    dao = await Dao.deploy(
      chairperson.address,
      token.address,
      minimumQuorum,
      debatingPeriodDuration
    );

    iToken = <TokenInterface>Token.interface;

    await token.transferOwnership(dao.address);
    await token.transfer(addr1.address, minimumQuorum);

    clean = await network.provider.send('evm_snapshot');
  });
  afterEach(async () => {
    await network.provider.send('evm_revert', [clean]);
    clean = await network.provider.send('evm_snapshot');
  });

  describe('Withdraw', () => {
    it('should withdraw tokens', async () => {
      const startBalance = await token.balanceOf(owner.address);

      await token.approve(dao.address, minimumQuorum);

      await dao.deposit(minimumQuorum);
      await dao.withdraw(minimumQuorum);
      const finalBalance = await token.balanceOf(owner.address);
      expect(finalBalance).to.be.eq(startBalance);
    });
    it('should withdraw a part of tokens', async () => {
      const startBalance = await token.balanceOf(owner.address);

      await token.approve(dao.address, minimumQuorum);

      await dao.deposit(minimumQuorum);
      await dao.withdraw(minimumQuorum / 2);
      await dao.withdraw(minimumQuorum / 2);
      const finalBalance = await token.balanceOf(owner.address);
      expect(finalBalance).to.be.eq(startBalance);
    });
    it('should decrease tokens', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);
      await dao.withdraw(minimumQuorum);

      const tx = dao.vote(1, true);
      const reason = "You don't have tokens";
      await expect(tx).to.be.revertedWith(reason);
    });
    it('should revert if amount equals 0', async () => {
      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);

      const tx = dao.withdraw(0);
      const reason = 'Amount should be greater than 0';
      await expect(tx).to.be.revertedWith(reason);
    });
    it('should revert if amount greater than user balance', async () => {
      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);

      const tx = dao.withdraw(minimumQuorum * 2);
      const reason = 'Amount greater than your balance';
      await expect(tx).to.be.revertedWith(reason);
    });
    it('should revert if user has no deposited tokens', async () => {
      const tx = dao.withdraw(minimumQuorum);
      const reason = "You don't have tokens";
      await expect(tx).to.be.revertedWith(reason);
    });
    it('should revert if the proposal is not finished', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);
      await dao.vote(1, true);

      const tx = dao.withdraw(minimumQuorum);
      const reason = 'You can withdraw after the latest proposal';
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should revert if all proposals aren't finished", async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);

      await increaseTime(debatingPeriodDuration / 2);

      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');
      await dao.vote(2, true);
      await dao.vote(1, true);

      await increaseTime(debatingPeriodDuration / 2);

      const tx = dao.withdraw(minimumQuorum);
      const reason = 'You can withdraw after the latest proposal';
      await expect(tx).to.be.revertedWith(reason);
    });
  });
  describe('deposit', () => {
    it('should summed up tokens', async () => {
      await token.approve(dao.address, minimumQuorum);

      await dao.deposit(minimumQuorum / 2);
      await dao.deposit(minimumQuorum / 2);

      const tx = dao.withdraw(minimumQuorum);
      const reason = 'Amount greater than your balance';
      await expect(tx).not.to.be.revertedWith(reason)
    });
  });
  describe('Vote', () => {
    it('can take part in several votes', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      const totalSupplyBefore = await token.totalSupply();

      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);
      await dao.vote(1, true);
      await dao.vote(2, true);

      await increaseTime(debatingPeriodDuration);

      await dao.finishProposal(1);
      await dao.finishProposal(2);

      const totalSupplyAfter = await token.totalSupply();
      expect(totalSupplyAfter).to.be.eq(totalSupplyBefore.add(5000 * 2));
    });
    it('should revert if user has no tokens', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      const tx = dao.vote(1, true);
      const reason = "You don't have tokens";
      await expect(tx).to.be.revertedWith(reason);
    });
    it('should revert if vote has already done', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);
      await dao.vote(1, true);

      const tx = dao.vote(1, true);
      const reason = "You've already done the voice";
      await expect(tx).to.be.revertedWith(reason);
    });
    it('should revert if proposal is not active', async () => {
      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);

      const tx = dao.vote(1, true);
      const reason = 'Proposal is not active';
      await expect(tx).to.be.revertedWith(reason);
    });
    it('should revert if debating period duration is over', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);

      await increaseTime(debatingPeriodDuration);

      const tx = dao.vote(1, true);
      const reason = 'Proposal is not active';
      await expect(tx).to.be.revertedWith(reason);
    });
  });
  describe('addProposal', () => {
    it('should call only by chairperson', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      const tx = dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');
      await expect(tx).not.to.be.reverted;
    });
    it('should revert if caller is not the chairperson', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      const tx = dao
        .connect(addr1)
        .addProposal(callData, token.address, 'Increase TotalSupply');
      const reason = 'Caller is not the chairperson';
      await expect(tx).to.be.revertedWith(reason);
    });
  });
  describe('finishProposal', () => {
    it('should execute call', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      const totalSupplyBefore = await token.totalSupply();

      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);
      await dao.vote(1, true);

      await increaseTime(debatingPeriodDuration);

      await dao.finishProposal(1);
      const totalSupplyAfter = await token.totalSupply();
      expect(totalSupplyAfter).to.be.eq(totalSupplyBefore.add(minimumQuorum));
    });
    it('should revert if debating period has not passed', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      const tx = dao.finishProposal(1);
      const reason = 'Debating period is not over';
      await expect(tx).to.be.revertedWith(reason);
    });
    it('should revert if proposal has already finished', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);
      await dao.vote(1, true);

      await increaseTime(debatingPeriodDuration);

      await dao.finishProposal(1);
      const tx = dao.finishProposal(1);
      const reason = 'Debate is over';
      await expect(tx).to.be.revertedWith(reason);
    });
    it('should fail proposal if votes lower than minimumQuorum', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      await token.approve(dao.address, minimumQuorum / 2);
      await dao.deposit(minimumQuorum / 2);
      await dao.vote(1, true);

      await increaseTime(debatingPeriodDuration);

      const tx = dao.finishProposal(1);
      await expect(tx)
        .to.be.emit(dao, 'FinishProposal')
        .withArgs(1, minimumQuorum / 2, 0, minimumQuorum / 2, false);
    });
    it('should fail proposal if cons greater than pros', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);
      await dao.vote(1, false);

      await increaseTime(debatingPeriodDuration);

      const tx = dao.finishProposal(1);
      await expect(tx)
        .to.be.emit(dao, 'FinishProposal')
        .withArgs(1, 0, minimumQuorum, minimumQuorum, false);
    });
    it('should fail proposal if cons equals pros', async () => {
      const callData = iToken.encodeFunctionData('mint', [dao.address, 5000]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);
      await dao.vote(1, true);

      await token.connect(addr1).approve(dao.address, minimumQuorum);
      await dao.connect(addr1).deposit(minimumQuorum);
      await dao.connect(addr1).vote(1, false);

      await increaseTime(debatingPeriodDuration);

      const tx = dao.finishProposal(1);
      await expect(tx)
        .to.be.emit(dao, 'FinishProposal')
        .withArgs(1, minimumQuorum, minimumQuorum, minimumQuorum * 2, false);
    });
    it('should fail proposal if function call failed', async () => {
      const callData = iToken.encodeFunctionData('transfer', [
        dao.address,
        minimumQuorum * 2,
      ]);
      await dao
        .connect(chairperson)
        .addProposal(callData, token.address, 'Increase TotalSupply');

      await token.approve(dao.address, minimumQuorum);
      await dao.deposit(minimumQuorum);
      await dao.vote(1, true);

      await increaseTime(debatingPeriodDuration);

      const tx = dao.finishProposal(1);
      await expect(tx)
        .to.be.emit(dao, 'FinishProposal')
        .withArgs(1, minimumQuorum, 0, minimumQuorum, false);
    });
  });
  describe('Setters', () => {
    describe('setMinimumQuorum', () => {
      it('should change minimumQuorum', async () => {
        const customValue = minimumQuorum * 2;
        await dao.setMinimumQuorum(customValue);
        const newValue = await dao.minimumQuorum();
        expect(newValue).to.be.eq(customValue);
      });
      it('should revert if caller is not the owner', async () => {
        const customValue = minimumQuorum * 2;
        const tx = dao.connect(addr1).setMinimumQuorum(customValue);
        const reason = 'Caller is not the owner';
        await expect(tx).to.be.revertedWith(reason);
      });
    });
    describe('setDebatingPeriodDuration', () => {
      it('should change debatingPeriodDuration', async () => {
        const customValue = debatingPeriodDuration * 2;
        await dao.setDebatingPeriodDuration(customValue);
        const newValue = await dao.debatingPeriodDuration();
        expect(newValue).to.be.eq(customValue);
      });
      it('should revert if caller is not the owner', async () => {
        const customValue = debatingPeriodDuration * 2;
        const tx = dao.connect(addr1).setDebatingPeriodDuration(customValue);
        const reason = 'Caller is not the owner';
        await expect(tx).to.be.revertedWith(reason);
      });
    });
  });
});
