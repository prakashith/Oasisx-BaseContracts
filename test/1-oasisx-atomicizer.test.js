const Atomicizer = artifacts.require('OasisXAtomicizer')

contract('OasisXAtomicizer',() => {
  it('should be deployed',async () => {
    return await Atomicizer.deployed()
  })
})
