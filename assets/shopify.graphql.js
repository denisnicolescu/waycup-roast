class ShopifyGraphql {
  static getConfig() {
    return {
      storeName: process.env.STORE_NAME,
      accessToken: process.env.STOREFRONT_API_ACCESS_TOKEN,
      apiVersion: process.env.STOREFRONT_API_VERSION
    };
  }

  static async query(query) {
    try {
      const { storeName, accessToken, apiVersion } = this.getConfig();

      const response = await fetch(`https://${storeName}.myshopify.com/api/${apiVersion}/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/graphql",
          "X-Shopify-Storefront-Access-Token": accessToken,
        },
        body: query,
      });

      if (!response.ok) {
        throw new Error(`Request failed. Status: ${response.status}`);
      }
      console.log({response});
      return response.json();
    } catch (error) {
      console.error("GraphQL error:", error.message);
      return { error: error.message };
    }
  }
}

