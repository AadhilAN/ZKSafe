package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	shell "github.com/ipfs/go-ipfs-api"
)

// Struct to receive shards from frontend
type ShardRequest struct {
	WalletAddress string   `json:"walletAddress"`
	Shards        []string `json:"shards"`
}

// IPFS shell (Change to your IPFS node or Infura API)
var ipfs *shell.Shell

func main() {
	// Connect to local or remote IPFS node
	ipfs = shell.NewShell("localhost:5020") // Replace with Infura/Web3.Storage if needed

	r := gin.Default()
	r.POST("/store-shards", storeShards)
	r.Run(":5015") // Run API on port 5001
}

// Stores shards on IPFS
func storeShards(c *gin.Context) {
	var req ShardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var ipfsHashes []string
	for _, shard := range req.Shards {
		hash, err := ipfs.Add(strings.NewReader(shard))
		if err != nil {
			log.Println("IPFS error:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store shards"})
			return
		}
		ipfsHashes = append(ipfsHashes, hash)
	}

	// Store IPFS hashes in a database (MongoDB/PostgreSQL)
	// Example: store in a file for now
	dbContent := fmt.Sprintf("Wallet: %s\nShards: %v\n", req.WalletAddress, ipfsHashes)
	_ = os.WriteFile("shard_db.txt", []byte(dbContent), 0644)

	// Return IPFS hashes
	c.JSON(http.StatusOK, gin.H{"message": "Shards stored", "ipfsHashes": ipfsHashes})
}
