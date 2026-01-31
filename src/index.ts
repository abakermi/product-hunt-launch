#!/usr/bin/env node
import { Command } from 'commander';
import axios from 'axios';
import 'dotenv/config';

const program = new Command();
const API_URL = 'https://api.producthunt.com/v2/api/graphql';

function getClient() {
  const token = process.env.PH_API_TOKEN;
  if (!token) {
    console.error("❌ Error: PH_API_TOKEN is missing.");
    process.exit(1);
  }
  return {
    query: async (query: string, variables: any = {}) => {
      try {
        const res = await axios.post(API_URL, { query, variables }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.data.errors) {
          throw new Error(res.data.errors[0].message);
        }
        return res.data.data;
      } catch (error: any) {
        console.error("API Error:", error.response?.data || error.message);
        process.exit(1);
      }
    }
  };
}

program
  .name('ph-launch')
  .description('Track Product Hunt launches')
  .version('1.0.0');

program.command('leaderboard')
  .description('Show today\'s leaderboard')
  .action(async () => {
    const client = getClient();
    const query = `
      query {
        posts(order: VOTES, first: 10, postedAfter: "${new Date(new Date().setHours(0,0,0,0)).toISOString()}") {
          edges {
            node {
              name
              tagline
              votesCount
              commentsCount
              url
            }
          }
        }
      }
    `;
    const data = await client.query(query);
    console.log("🏆 Today's Leaderboard:");
    data.posts.edges.forEach((edge: any, index: number) => {
      const p = edge.node;
      console.log(`#${index + 1} ${p.name} - 🔼 ${p.votesCount} 💬 ${p.commentsCount}`);
      console.log(`   ${p.tagline}`);
    });
  });

program.command('stats')
  .argument('<slug>', 'Product slug (e.g. "notion")')
  .description('Get stats for a specific product')
  .action(async (slug) => {
    const client = getClient();
    const query = `
      query($slug: String!) {
        post(slug: $slug) {
          name
          votesCount
          commentsCount
          rank
          website
        }
      }
    `;
    const data = await client.query(query, { slug });
    const p = data.post;
    if (!p) {
      console.log("❌ Product not found.");
      return;
    }
    console.log(`🚀 ${p.name}`);
    console.log(`----------------`);
    console.log(`🔼 Upvotes:  ${p.votesCount}`);
    console.log(`💬 Comments: ${p.commentsCount}`);
    console.log(`🏆 Rank:     #${p.rank || 'N/A'}`); // Rank might require paid API access in v2, sometimes null
  });

program.parse();
