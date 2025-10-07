# 🚀 Decentralized Drone Data Sharing for Crop Mapping

Welcome to an innovative Web3 solution that revolutionizes agriculture through decentralized drone data sharing! This project enables farmers, agronomists, and researchers to securely share, monetize, and access drone-captured crop mapping data on the Stacks blockchain. By leveraging blockchain, it addresses real-world problems like data silos, lack of trust in centralized platforms, high costs of data acquisition, and inefficient crop monitoring in precision agriculture.

## ✨ Features

🌾 Upload and timestamp drone data (e.g., aerial images, NDVI maps) with immutable proofs  
💰 Monetize data through a tokenized marketplace with fair revenue sharing  
🔒 Control access with granular permissions and encryption keys  
📊 Query and analyze aggregated crop data for insights like yield predictions  
🏆 Earn rewards for contributing verified high-quality data  
⚖️ Resolve disputes via on-chain governance and voting  
🌐 Integrate with oracles for real-time weather or satellite validation  
🚫 Prevent data duplication and ensure authenticity with hashing

## 🛠 How It Works

This project is built using Clarity smart contracts on the Stacks blockchain, ensuring security and Bitcoin-anchored finality. It involves 8 interconnected smart contracts to handle various aspects of data sharing and management.

### Smart Contracts Overview
1. **UserRegistry.clar**: Registers users (farmers, drone operators, data consumers) with roles and verifies identities via STX addresses.  
2. **DataUpload.clar**: Allows uploading data metadata and hashes (e.g., IPFS CID for drone images), with timestamping for provenance.  
3. **AccessControl.clar**: Manages permissions, granting/revoking access to data via encrypted keys or NFTs representing data ownership.  
4. **Marketplace.clar**: Facilitates buying/selling data access using STX or custom tokens, with automated royalty distributions.  
5. **RewardToken.clar**: Issues and distributes governance/reward tokens (e.g., ERC-20 like) for data contributions and validations.  
6. **DataVerification.clar**: Verifies data quality and authenticity using oracles or community voting, preventing spam.  
7. **DisputeResolution.clar**: Handles disputes over data accuracy or access, with on-chain arbitration and slashing mechanisms.  
8. **AnalyticsQuery.clar**: Provides read-only queries for aggregated data analytics, like average crop health across regions.

**For Data Providers (e.g., Farmers or Drone Operators)**  
- Capture drone data and generate a SHA-256 hash or upload to IPFS.  
- Call `register-data` in DataUpload.clar with:  
  - Data hash or CID  
  - Metadata (e.g., location, crop type, timestamp)  
  - Optional price for access  
- Use AccessControl.clar to set permissions (public, paid, or private).  
- Earn rewards via RewardToken.clar when data is verified and used.

Boom! Your crop mapping data is now securely shared and monetizable on the blockchain.

**For Data Consumers (e.g., Researchers or Agribusinesses)**  
- Search for data using AnalyticsQuery.clar (e.g., query by region or crop).  
- Purchase access via Marketplace.clar, paying in STX.  
- Call `grant-access` in AccessControl.clar to receive decryption keys.  
- Verify data provenance with DataVerification.clar.

Instant access to reliable, decentralized crop insights!

**For Validators/Governance**  
- Participate in data verification votes using DataVerification.clar.  
- Resolve issues via DisputeResolution.clar with token-weighted voting.  
- Hold reward tokens from RewardToken.clar to influence project decisions.

This setup promotes collaboration in agriculture, reduces costs for small farmers, and enables data-driven decisions for sustainable farming. Deploy on Stacks for low fees and high security!