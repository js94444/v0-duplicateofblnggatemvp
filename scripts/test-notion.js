import { Client } from "@notionhq/client";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

console.log("=== Notion API Test ===");
console.log("API Key (first 20 chars):", NOTION_API_KEY?.substring(0, 20) + "...");
console.log("Database ID:", DATABASE_ID);

const notion = new Client({ auth: NOTION_API_KEY });

async function test() {
  try {
    // 1. 데이터베이스 조회 테스트
    console.log("\n1. Testing database query...");
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      page_size: 1,
    });
    console.log("SUCCESS! Database found. Pages count:", response.results.length);
    
    // 2. 데이터베이스 정보 조회
    console.log("\n2. Getting database info...");
    const dbInfo = await notion.databases.retrieve({
      database_id: DATABASE_ID,
    });
    console.log("Database title:", dbInfo.title?.[0]?.plain_text || "No title");
    console.log("Properties:", Object.keys(dbInfo.properties).join(", "));
    
  } catch (error) {
    console.error("\nERROR:", error.message);
    console.error("Error code:", error.code);
    console.error("Full error:", JSON.stringify(error, null, 2));
  }
}

test();
