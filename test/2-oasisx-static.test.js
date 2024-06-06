const OasisXAtomicizer = artifacts.require('OasisXAtomicizer')
const OasisXStatic = artifacts.require('OasisXStatic')

contract('OasisXStatic',() => {
  it('is deployed',async () => {
    return await OasisXStatic.deployed();
  })

  it('has the correct atomicizer address',async () => {
    let [atomicizerInstance,staticInstance] = await Promise.all([OasisXAtomicizer.deployed(),OasisXStatic.deployed()])
    assert.equal(await staticInstance.atomicizer(),atomicizerInstance.address,'incorrect atomicizer address')
  })
})
