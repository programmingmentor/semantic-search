import { readFile } from "node:fs/promises";
import readline from "node:readline";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

const products = JSON.parse(await readFile("./products.json", "utf8"));

function createStore(products) {
  const embeddings = new OpenAIEmbeddings();
  return MemoryVectorStore.fromDocuments(
    products.map(
      (product) =>
        new Document({
          pageContent: `Title: ${product.name}
  Description: ${product.description}
  Price: ${product.price}`,
          metadata: { sourceId: product.id },
        })
    ),
    embeddings
  );
}

const store = await createStore(products);

async function searchProducts(query, count = 1) {
  const searchResults = await store.similaritySearch(query, count);
  return searchResults.map((result) =>
    products.find((product) => product.id === result.metadata.sourceId)
  );
}

async function searchLoop() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (query) =>
    new Promise((resolve) => rl.question(query, resolve));

  while (true) {
    const query = await askQuestion(
      'Enter your search query (or type "exit" to quit): '
    );

    if (query.toLowerCase() === "exit") break;

    const products = await searchProducts(query, 3);

    if (products.length === 0) {
      console.log("No products found for your query.");
    } else {
      console.log("Products found:");
      products.forEach((product, index) => {
        console.log(
          `${index + 1}. ${product.name}: ${product.description}: ${
            product.price
          }`
        );
      });
    }
  }

  rl.close();
}

await searchLoop();