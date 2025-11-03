import { somniaTestnet } from '../config/wagmi'

export async function addSomniaNetwork() {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed')
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${somniaTestnet.id.toString(16)}`, // Convert to hex
          chainName: somniaTestnet.name,
          nativeCurrency: somniaTestnet.nativeCurrency,
          rpcUrls: somniaTestnet.rpcUrls.default.http,
          blockExplorerUrls: [somniaTestnet.blockExplorers.default.url],
        },
      ],
    })
    
    return true
  } catch (error) {
    console.error('Failed to add Somnia network:', error)
    throw error
  }
}

export async function switchToSomnia() {
  try {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed')
    }

    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${somniaTestnet.id.toString(16)}` }],
    })
    
    return true
  } catch (error) {
    // If the chain hasn't been added, add it
    if (error.code === 4902) {
      return await addSomniaNetwork()
    }
    throw error
  }
}
