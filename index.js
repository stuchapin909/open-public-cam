#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.join(__dirname, "community-registry.json");
const LOG_PATH = path.join(__dirname, "validation-log.json");
const SNAPSHOTS_DIR = path.join(__dirname, "snapshots");
const USER_CONFIG_DIR = path.join(os.homedir(), ".eagleeye");
const USER_CONFIG_PATH = path.join(USER_CONFIG_DIR, "config.json");

// Version 5.0.0 — Auth metadata, TfL cameras, user config for API keys
const VERSION = "5.0.0";

// GitHub Constants
const GITHUB_OWNER = "stuchapin909";
const GITHUB_REPO = "Eagle-Eye";
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/master`;

if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
if (!fs.existsSync(USER_CONFIG_DIR)) fs.mkdirSync(USER_CONFIG_DIR, { recursive: true });

const server = new McpServer({ name: "eagle-eye", version: VERSION });

// v5.0.0 Curated List — verified direct-image webcams with auth metadata
// Auth schema (optional field on each camera):
//   {
//     provider: "Transport for London",        // Human-readable provider name
//     signup_url: "https://...",               // Where to register for a key
//     key_required: false,                     // Whether the image URL needs a key at fetch time
//     key_type: "query_params" | "header",     // How to inject the key (if key_required=true)
//     key_names: ["app_key"],                  // Query param or header names
//     config_key: "TFL_API_KEY",              // Key name in ~/.eagleeye/config.json
//     note: "Free registration required..."    // Free-form description
//   }
const CURATED_WEBCAMS = [
  {
    id: "nyc-bb-21-north-rdwy-at-above-south-st",
    name: "BB-21 North Rdwy @ Above South St",
    url: "https://nyctmc.org/api/cameras/30bcfac8-ebd1-40c7-ae4c-1d93113bd465/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-6-ave-at-58-st",
    name: "6 Ave @ 58 St",
    url: "https://nyctmc.org/api/cameras/a4c12003-9638-473d-bfe3-dddf509c80b8/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-3-ave-at-34-st",
    name: "3 AVE @ 34 ST",
    url: "https://nyctmc.org/api/cameras/15f7a00b-5afb-4193-a5e4-dfe7710a5dfe/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-50-st-btwn8-ave-broadway",
    name: "50 St Btwn 8 Ave & Broadway",
    url: "https://nyctmc.org/api/cameras/0a49d947-2a5b-498d-a386-2cef5ce883fa/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-mhb-23-manh-lrdwy-at-twr",
    name: "MHB-23 Manh LRDWY @ Twr",
    url: "https://nyctmc.org/api/cameras/097a7d75-1c6f-4817-aa34-1de4bb9202f4/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-cpw-at-110-st",
    name: "CPW @ 110 St",
    url: "https://nyctmc.org/api/cameras/c217a64e-95c3-4442-96d1-7a6c177615d7/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-mhb-16-manhattan-colonade-entr",
    name: "MHB-16 Manhattan Colonade Entr",
    url: "https://nyctmc.org/api/cameras/fec41cf4-e167-48ae-9d40-785d8e86078d/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-houston-st-at-broadway",
    name: "Houston St @ Broadway",
    url: "https://nyctmc.org/api/cameras/5214cfe8-ccfc-42e9-8e2a-ff2865c1a518/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-west-st-and-chambers",
    name: "West st and Chambers",
    url: "https://nyctmc.org/api/cameras/34616ac5-0cc5-4b86-ac7a-82c77238a536/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-3-ave-at-14-st",
    name: "3 Ave @ 14 St",
    url: "https://nyctmc.org/api/cameras/63bf5db0-582d-4482-ad51-52338c7f9906/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-lincoln-tun-approachbet-9av-10av-at-w-33-st-350",
    name: "Lincoln Tun Approach(Bet. 9Av & 10Av) @ W 33 St - 3.50",
    url: "https://nyctmc.org/api/cameras/bb9ce48d-0458-4493-89ad-ae51065b5796/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-1-ave-at-57-st",
    name: "1 Ave @ 57 st",
    url: "https://nyctmc.org/api/cameras/79f45918-c13e-4357-9ccb-9e3e7ea5b6af/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-worth-street-at-lafayette-street",
    name: "Worth Street @ Lafayette Street",
    url: "https://nyctmc.org/api/cameras/ebec9de9-3f56-477a-a413-2e0a09b2b6ba/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-rockefeller-plaza-at-w-51-st",
    name: "Rockefeller Plaza @ W 51 St",
    url: "https://nyctmc.org/api/cameras/bff9cee2-1513-4af3-9838-ea7a35552049/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-dyer-ave-at-w-40-st",
    name: "Dyer Ave @ W 40 St",
    url: "https://nyctmc.org/api/cameras/bb362cd8-057b-4538-bdee-cf846a725ea0/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-canal-st-at-greenwich-st-holland-tunnel",
    name: "Canal St @ Greenwich St ( Holland Tunnel )",
    url: "https://nyctmc.org/api/cameras/25ad72fe-e74c-49af-b4c0-34c9eac14655/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-hudson-st-at-laight-st",
    name: "Hudson St @ Laight St",
    url: "https://nyctmc.org/api/cameras/24101bcf-29a7-4417-b77d-1f0368dc212d/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-12-ave-at-22-st",
    name: "12 Ave @ 22 St",
    url: "https://nyctmc.org/api/cameras/9b923606-16ba-45ad-a105-aabcc98ef1fa/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-11-ave-at-57-st",
    name: "11 Ave @ 57 St",
    url: "https://nyctmc.org/api/cameras/6024ac17-0c26-4435-96e5-560c41b920ad/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-7-ave-at-40-st",
    name: "7 Ave @ 40 St",
    url: "https://nyctmc.org/api/cameras/5d055599-875a-4010-991f-e7e454889052/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-west-st-and-west-thames-battery-tunnel",
    name: "West st and West Thames (Battery tunnel)",
    url: "https://nyctmc.org/api/cameras/86d418ab-10bc-4b73-a283-153abffabb0f/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-henry-hudson-pkwy-at-125-st",
    name: "Henry Hudson Pkwy @ 125 St",
    url: "https://nyctmc.org/api/cameras/ca545979-d0c1-4735-88d6-61b6311bb6bc/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-rockefeller-plaza-at-w-50-st",
    name: "Rockefeller Plaza @ W 50 St",
    url: "https://nyctmc.org/api/cameras/e38fd7b8-c074-4b6e-bc52-4dd932145239/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-7-ave-at-34-st",
    name: "7 Ave @ 34 St",
    url: "https://nyctmc.org/api/cameras/ee1b1d85-e8ce-485f-a539-12962933eb9f/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-harlem-river-dr-at-150-st",
    name: "Harlem River Dr @ 150 St",
    url: "https://nyctmc.org/api/cameras/dfc5bbff-683c-483d-bed5-8ff2b7c4781b/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-delancy-st-at-essex-st",
    name: "Delancy St @ Essex St",
    url: "https://nyctmc.org/api/cameras/1f0cfaad-4c0a-46e8-a5e3-f206d83a875d/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-grand-st-at-broadway",
    name: "Grand St @ Broadway",
    url: "https://nyctmc.org/api/cameras/63e79f0b-7dea-4c8e-864c-f3315f9cc62c/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-6-ave-at-39-st",
    name: "6 Ave @ 39 St",
    url: "https://nyctmc.org/api/cameras/34674be5-4791-47f1-b0b2-2db0ff619732/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-audobon-ave-at-w-181-st",
    name: "Audobon Ave @ W 181 ST",
    url: "https://nyctmc.org/api/cameras/1ccb8d7c-43d4-450e-b40c-79527766db75/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-broadway-at-46-st",
    name: "Broadway @ 46 St",
    url: "https://nyctmc.org/api/cameras/0c9a2836-c408-48d3-85c7-1977c33d9133/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-br-br-20-s-rdwy-fdr-dr",
    name: "Br Br-20 S Rdwy FDR Dr",
    url: "https://nyctmc.org/api/cameras/c6022d8a-69df-45be-aadd-ec39a18a18fb/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-62-st-at-qbb-upper-level-exit-ramp",
    name: "62 St @ QBB Upper Level exit ramp",
    url: "https://nyctmc.org/api/cameras/a26130e0-3c9b-4f43-b253-209d80d441f8/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-worth-st-at-centre-st",
    name: "Worth St @ Centre St",
    url: "https://nyctmc.org/api/cameras/07b8616e-373e-4ec9-89cc-11cad7d59fcb/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-qbb-ul-cm-at-york-ave",
    name: "QBB UL CM @ York Ave",
    url: "https://nyctmc.org/api/cameras/975c7dd6-d6d7-4eaa-843d-fbe8eb7a1eb3/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-galvin-ave-at-w-40-st",
    name: "Galvin Ave @ W 40 St",
    url: "https://nyctmc.org/api/cameras/82b5a027-8b2d-43ce-ba8e-329382bd61bf/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-houston-st-at-christies-st",
    name: "Houston St @ Christies St",
    url: "https://nyctmc.org/api/cameras/444aa32f-8102-4ca6-a7f8-5c9fd8fd5571/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-henry-hudson-at-137-st",
    name: "Henry Hudson @ 137 St",
    url: "https://nyctmc.org/api/cameras/0ad90cca-a6b0-4968-abdd-ca81ae497848/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-madison-ave-at-46-st-manhattan",
    name: "Madison Ave @ 46 St - Manhattan",
    url: "https://nyctmc.org/api/cameras/434094f8-1be4-4c19-8067-1e11049e46b4/image",
    category: "city",
    location: "Manhattan, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c2-bqe-30b-w-at-stewart-ave",
    name: "C2-BQE-30B_W_at_Stewart Ave",
    url: "https://nyctmc.org/api/cameras/42e78c2b-3c70-47dc-8685-f1b5eca3deb5/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-mhb-33-bklyn-lrw-at-ex-ramp",
    name: "MHB-33 Bklyn LRW @ Ex Ramp",
    url: "https://nyctmc.org/api/cameras/e4767b49-3611-4be2-895f-1fc03261653b/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-3-ave-at-65-st-ent-eb-bqegowanus",
    name: "3 Ave @ 65 St - Ent. EB BQE/Gowanus",
    url: "https://nyctmc.org/api/cameras/be6b6830-b90d-40ab-98ab-9d67eb81e673/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-4-ave-at-38-st-17990",
    name: "4 Ave @ 38 st - 179.90",
    url: "https://nyctmc.org/api/cameras/5cc1f365-af4a-48be-8819-8f12e18725a3/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c2-bqe-25-wb-at-s5th-st-ex32",
    name: "C2-BQE-25-WB_at_S.5th_St-Ex32",
    url: "https://nyctmc.org/api/cameras/c79840eb-e25e-41cc-8a54-f8eaa6e29463/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-ocean-pkwy-at-surf-av-at-sea-breeze-ave",
    name: "Ocean Pkwy @ Surf Av @ Sea Breeze Ave",
    url: "https://nyctmc.org/api/cameras/856ef0b2-123d-4211-9619-1334fb7ac219/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-grand-st-at-graham-ave",
    name: "Grand St @ Graham Ave",
    url: "https://nyctmc.org/api/cameras/7609996b-ec61-4c06-bb58-c9aa93c65b80/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-mcdonald-ave-at-10th-ave-20th-st",
    name: "McDonald Ave @ 10th Ave / 20th St",
    url: "https://nyctmc.org/api/cameras/f9608ba1-608f-4dad-a8aa-9a9c1978b363/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-flatbush-ave-at-utica-ave",
    name: "Flatbush Ave @ Utica Ave",
    url: "https://nyctmc.org/api/cameras/e49e8537-9891-44ba-ac1f-41db307934cf/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-3-ave-at-60-st",
    name: "3 Ave @ 60 St",
    url: "https://nyctmc.org/api/cameras/88278063-8891-4144-9295-f5dc9a94d2ea/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-wbb-2-nor-at-above-bedford-ave-s-5-st",
    name: "WBB - 2 NOR @ ABOVE BEDFORD AVE & S 5 St",
    url: "https://nyctmc.org/api/cameras/8d2b3ae9-da68-4d37-8ae2-d3bc014f827b/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-flatbush-ave-at-fillmore-ave",
    name: "Flatbush Ave @ Fillmore Ave",
    url: "https://nyctmc.org/api/cameras/43a4279e-de3a-4ab3-8c86-b268eb5e8848/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-grand-army-plaza",
    name: "Grand Army Plaza",
    url: "https://nyctmc.org/api/cameras/1c51b3ec-3d29-4025-928d-4e182e7c0bd5/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c2-pe-05-ctr-at-7th-ave-ex4",
    name: "C2-PE-05-Ctr_at_7th_Ave-Ex4",
    url: "https://nyctmc.org/api/cameras/d401c83b-2f78-49dd-8974-14c819a992b2/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c2-bqe-04-wb-at-sackett-st-ex26",
    name: "C2-BQE-04_WB_at_Sackett_St-Ex26",
    url: "https://nyctmc.org/api/cameras/1da7a29e-9993-4b93-b13a-e29b40c2069d/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c2-bqe-20-wb-at-wythe-ave-ex31",
    name: "C2-BQE-20-WB_at_Wythe_Ave-Ex31",
    url: "https://nyctmc.org/api/cameras/6d42b7fb-604b-4172-b35d-c0556c5d3fcf/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-cadman-plz-west-at-tillary-st",
    name: "Cadman Plz West @ Tillary St",
    url: "https://nyctmc.org/api/cameras/07c5a9ab-38b0-4176-a932-395cded5858e/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-atlantic-ave-at-barclays-center",
    name: "Atlantic Ave @ Barclays Center",
    url: "https://nyctmc.org/api/cameras/053afe02-e1b3-4bea-9995-787e72c7fff4/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-wbb-4-at-nor-bklyn-mid-span",
    name: "WBB-4 @ NOR Bklyn-Mid Span",
    url: "https://nyctmc.org/api/cameras/f5d272cf-3bc6-48c3-94d0-808c4003a4e9/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-old-fulton-st-at-furman-st",
    name: "Old Fulton St @ Furman St",
    url: "https://nyctmc.org/api/cameras/9010e3c3-c888-43d4-9c26-59e9b802dbcb/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-wythe-ave-at-williamsburg-st-e",
    name: "Wythe Ave @ Williamsburg st E",
    url: "https://nyctmc.org/api/cameras/45b87983-6659-4be7-a354-15d756664204/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-rockaway-pkwy-at-seaview-ave",
    name: "Rockaway Pkwy @ Seaview Ave",
    url: "https://nyctmc.org/api/cameras/d016d3ce-4399-4487-a1a8-2c16620a251d/image",
    category: "city",
    location: "Brooklyn, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-beach-channel-dr-atb-32-st",
    name: "Beach Channel Dr @B 32 St",
    url: "https://nyctmc.org/api/cameras/4c47eda8-a4a1-4e40-baea-578e0a99e1d8/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-seagirt-blvd-at-b-32-st",
    name: "Seagirt Blvd @ B 32 St",
    url: "https://nyctmc.org/api/cameras/a01a8c98-d314-4eb4-b97c-4a4f80d71c4b/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-cross-island-pkwy-at-union-tpke",
    name: "Cross Island Pkwy @ Union Tpke",
    url: "https://nyctmc.org/api/cameras/7ae83f13-3d0e-4fd3-bc88-6fc41bde04c3/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-east-21-st-at-qbb-upper-roadway-exit-ramp",
    name: "East 21 st @ QBB Upper Roadway Exit Ramp",
    url: "https://nyctmc.org/api/cameras/167fabd4-70d7-4b74-add4-8cc077efe3f6/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-grand-central-pkwy-nsr-at-79-st",
    name: "Grand Central Pkwy NSR @ 79 St",
    url: "https://nyctmc.org/api/cameras/fa85ed07-ccc9-4dc7-97bd-fd55acc0a415/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-qbb-ul-at-queens-pier",
    name: "QBB UL @ Queens Pier",
    url: "https://nyctmc.org/api/cameras/bfcb2b32-7ae7-4060-a39b-80f71a1db289/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-farmers-blvd-at-n-conduit-ave",
    name: "Farmers Blvd @ N Conduit Ave",
    url: "https://nyctmc.org/api/cameras/89f83119-67ea-4395-9402-66cc19f5d57b/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c5-bqe-41-eb-at-31st-ave-ex43",
    name: "C5-BQE-41-EB_at_31st_Ave-Ex43",
    url: "https://nyctmc.org/api/cameras/da689305-b159-4051-9d01-9881803adb4b/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c5-bqe-45-eb-at-gcp-astoria-blvd",
    name: "C5-BQE-45-EB_at_GCP-Astoria_Blvd",
    url: "https://nyctmc.org/api/cameras/7bac53fa-8296-40f8-9297-e7e67597a92c/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-metropolitan-ave-at-fresh-pond-rd",
    name: "Metropolitan Ave @ Fresh Pond Rd",
    url: "https://nyctmc.org/api/cameras/4ec4d8da-6dcb-444d-b33a-096a7d07bb51/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c5-lie-15-wb-at-queens-blvd-ex19",
    name: "C5-LIE-15-WB_at_Queens_Blvd-Ex19",
    url: "https://nyctmc.org/api/cameras/ae1960ee-1f34-4774-88f5-b195b9c2a505/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-hempstead-ave-at-cross-island-pkwy-ptz",
    name: "Hempstead Ave @ Cross Island Pkwy (PTZ)",
    url: "https://nyctmc.org/api/cameras/81c2390a-2dc5-4a44-9fc3-9870b360032e/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-woodhaven-blvd-at-union-tpke",
    name: "Woodhaven Blvd @ Union Tpke",
    url: "https://nyctmc.org/api/cameras/1b2c9e6b-8c35-47a2-aa60-fdd688cb61bf/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-northern-blvd-at-honeywell-bridge",
    name: "Northern Blvd @ Honeywell Bridge",
    url: "https://nyctmc.org/api/cameras/9b4553f1-6aa3-46eb-8905-ecbfecb83ce3/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-crescent-st-at-41-ave",
    name: "Crescent st @ 41 Ave",
    url: "https://nyctmc.org/api/cameras/557af346-2f9f-4306-8388-3974b7a49e4d/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-s-conduit-ave-at-150-st",
    name: "S Conduit Ave @ 150 St",
    url: "https://nyctmc.org/api/cameras/aa857aaf-dd05-46e7-9091-a6c8596a3fbf/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-long-island-expy-at-qmt-at-pulaski-br",
    name: "Long Island Expy @ QMT @ Pulaski Br",
    url: "https://nyctmc.org/api/cameras/67f77766-bd19-4082-adeb-88d59866c490/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-queens-plaza-n-at-northern-blvd",
    name: "Queens Plaza N @ Northern Blvd",
    url: "https://nyctmc.org/api/cameras/a0ecf291-582c-4c42-933f-0b9ed4ce885c/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-jamaica-ave-at-165-st",
    name: "Jamaica Ave @ 165 St",
    url: "https://nyctmc.org/api/cameras/85312947-96ae-4fce-a1f6-c6167e2f3004/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-beach-channel-dr-atb-90-st",
    name: "Beach Channel Dr @B 90 St",
    url: "https://nyctmc.org/api/cameras/4b99e17b-d784-4ae3-a8f4-fb20e05895ee/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-northern-blvd-at-francis-lewis-blvd",
    name: "Northern Blvd @ Francis Lewis Blvd",
    url: "https://nyctmc.org/api/cameras/a8b56a8b-1451-4290-9d8f-c770f80c855a/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-rockaway-blvd-at-van-wyck-expy-e-sr",
    name: "Rockaway Blvd @ Van Wyck Expy E S/R",
    url: "https://nyctmc.org/api/cameras/857e40b2-566a-4917-bc08-47920babf3f9/image",
    category: "city",
    location: "Queens, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c3-sie-07-eb-at-woolley-ave-ex10",
    name: "C3-SIE-07-EB_at_Woolley_Ave-Ex10",
    url: "https://nyctmc.org/api/cameras/a1295144-6d4b-4e63-8475-a4fff6020e53/image",
    category: "city",
    location: "Staten Island, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-victory-blvd-at-bay-st",
    name: "Victory Blvd @ Bay St",
    url: "https://nyctmc.org/api/cameras/36d22d6d-bffd-4466-8a9c-9c78a1bb9021/image",
    category: "city",
    location: "Staten Island, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-richmond-ave-at-north-access-rd",
    name: "Richmond Ave @ North Access Rd",
    url: "https://nyctmc.org/api/cameras/0537e9a6-3e6f-480c-9c6e-bb3ad15356ae/image",
    category: "city",
    location: "Staten Island, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-sie-at-clove-rd",
    name: "SIE @ Clove Rd",
    url: "https://nyctmc.org/api/cameras/2d1ed99a-c3d3-4616-a0d6-a9fe16f3e48c/image",
    category: "city",
    location: "Staten Island, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-hylan-blvd-at-huguenot-ave",
    name: "Hylan Blvd @ Huguenot Ave",
    url: "https://nyctmc.org/api/cameras/5e7535c0-fee4-4989-8481-0addea488020/image",
    category: "city",
    location: "Staten Island, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c3-wse-04-sb-at-rossville-ave-ex4",
    name: "C3-WSE-04-SB_at_Rossville_Ave-Ex4",
    url: "https://nyctmc.org/api/cameras/1ede87de-aba2-45bb-a792-cadf59eb792e/image",
    category: "city",
    location: "Staten Island, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c3-sie-02-eb-at-wse-int-ex3",
    name: "C3-SIE-02-EB_at_WSE_Int-Ex3",
    url: "https://nyctmc.org/api/cameras/07f88e60-2b93-4bba-9784-8cac3c9b7f52/image",
    category: "city",
    location: "Staten Island, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-drumgoole-rd-w-at-richmond-ave-quad-ptz-0162",
    name: "Drumgoole Rd W @ Richmond Ave - quad - ptz - 0.162",
    url: "https://nyctmc.org/api/cameras/4c3de40f-6f13-491f-9253-1fc93cada807/image",
    category: "city",
    location: "Staten Island, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-lily-pond-ave-at-school-rd",
    name: "Lily Pond Ave @ School Rd",
    url: "https://nyctmc.org/api/cameras/1c3a5c25-a40c-40d6-8f6b-030294269fd1/image",
    category: "city",
    location: "Staten Island, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c3-sie-09-eb-at-manor-rd",
    name: "C3-SIE-09-EB_at_ Manor_Rd",
    url: "https://nyctmc.org/api/cameras/5ec4ce2f-d86d-4899-b464-436fdcde72eb/image",
    category: "city",
    location: "Staten Island, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-new-eng-thru-at-bartow",
    name: "New Eng Thru @ Bartow",
    url: "https://nyctmc.org/api/cameras/4f806706-c888-4926-932c-f9f3f0255b60/image",
    category: "city",
    location: "Bronx, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c1-mde-03-sb-at-e138th-st-ex3",
    name: "C1-MDE-03-SB_at_E.138th_St-Ex3",
    url: "https://nyctmc.org/api/cameras/7c996b88-8ee6-4b0d-99c8-5764cf68f3bc/image",
    category: "city",
    location: "Bronx, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-3rd-av-at-e-156-st",
    name: "3rd Av. @ E 156 St.",
    url: "https://nyctmc.org/api/cameras/11ce0ee6-349b-4120-a66e-6299d28915f5/image",
    category: "city",
    location: "Bronx, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-hutchhinson-river-pkwy-at-bruckner-expy",
    name: "Hutchhinson River Pkwy @ Bruckner Expy",
    url: "https://nyctmc.org/api/cameras/c90f122a-2ea4-4614-b434-3599bcb04a19/image",
    category: "city",
    location: "Bronx, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c1-mde-09-sb-at-depot-pl-ex7-cbx",
    name: "C1-MDE-09-SB_at_Depot_Pl-Ex7-CBX",
    url: "https://nyctmc.org/api/cameras/c8b15922-4262-459a-85d5-17442ec9c54f/image",
    category: "city",
    location: "Bronx, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-c1-brp-01-sb-at-e174th-st-ex3",
    name: "C1-BRP-01-SB_at_E.174th_St-Ex3",
    url: "https://nyctmc.org/api/cameras/8431fefb-2068-4c83-920a-a6db628e7ce6/image",
    category: "city",
    location: "Bronx, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-bruckner-blvd-e-white-plains-rd-camera-1",
    name: "Bruckner Blvd E / White Plains Rd- Camera 1",
    url: "https://nyctmc.org/api/cameras/0951f345-28ef-447c-af7f-1cb4e0e16aa8/image",
    category: "city",
    location: "Bronx, New York, USA",
    timezone: "America/New_York",
    verified: true
  },
  {
    id: "nyc-major-deegan-expy-atvan-cortland-pk-s",
    name: "Major Deegan Expy @Van Cortland Pk S",
    url: "https://nyctmc.org/api/cameras/b6cd1640-fdc3-4525-bbb4-f148699876df/image",
    category: "city",
    location: "Bronx, New York, USA",
    timezone: "America/New_York",
    verified: true
  }
];

// --- User Config ---
function getUserConfig() {
  try {
    if (fs.existsSync(USER_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(USER_CONFIG_PATH, "utf8"));
    }
  } catch {}
  return {};
}

function getUserApiKeys() {
  return getUserConfig().api_keys || {};
}

// --- Helpers ---
const getCommunityData = () => { try { return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8")); } catch (e) { return []; } };
const getValidationLog = () => { try { return JSON.parse(fs.readFileSync(LOG_PATH, "utf8")); } catch (e) { return {}; } };
const saveRegistry = (data) => fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2));
const saveLog = (data) => fs.writeFileSync(LOG_PATH, JSON.stringify(data, null, 2));

function findWebcam(idOrUrl) {
  return CURATED_WEBCAMS.find(c => c.id === idOrUrl || c.url === idOrUrl) || getCommunityData().find(c => c.id === idOrUrl || c.url === idOrUrl);
}

function isNighttimeAt(timezone) {
  if (!timezone) return false;
  try {
    const hour = new Date().toLocaleString("en-US", { timeZone: timezone, hour: "numeric", hour12: false });
    return parseInt(hour, 10) >= 20 || parseInt(hour, 10) < 6;
  } catch (e) { return false; }
}

const HUMAN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'image',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Site': 'cross-site'
};

async function validateImageUrl(url) {
  try {
    const resp = await axios.get(url, { timeout: 5000, headers: HUMAN_HEADERS, responseType: 'stream' });
    const ct = resp.headers['content-type'] || "";
    resp.data.destroy();
    return ct.includes('image/');
  } catch (e) { return false; }
}

/**
 * Build request config for a camera, injecting API keys if needed.
 * Returns { url, headers } or { error } if required keys are missing.
 */
function buildRequestConfig(cam) {
  const auth = cam.auth;
  if (!auth || !auth.key_required) {
    return { url: cam.url, headers: { ...HUMAN_HEADERS } };
  }

  const apiKeys = getUserApiKeys();
  const configKey = auth.config_key || auth.key_names?.[0];

  if (!configKey || !apiKeys[configKey]) {
    return {
      error: `This camera requires an API key from ${auth.provider}.\n` +
        `Sign up: ${auth.signup_url}\n` +
        `Then add to ${USER_CONFIG_PATH}:\n` +
        `{\n  "api_keys": {\n    "${configKey}": "your-key-here"\n  }\n}`
    };
  }

  const url = new URL(cam.url);
  const headers = { ...HUMAN_HEADERS };

  if (auth.key_type === "header") {
    for (const keyName of auth.key_names || [configKey]) {
      headers[keyName] = apiKeys[configKey];
    }
  } else {
    for (const keyName of auth.key_names || [configKey]) {
      url.searchParams.set(keyName, apiKeys[configKey]);
    }
  }

  return { url: url.toString(), headers };
}

// SNAPSHOT TOOL
server.tool(
  "get_webcam_snapshot",
  "Capture a live snapshot from a registered webcam.",
  { cam_id: z.string().describe("Webcam ID or URL") },
  async ({ cam_id }) => {
    const cam = findWebcam(cam_id);
    if (!cam) return { content: [{ type: "text", text: `Error: Cam '${cam_id}' not found.` }], isError: true };

    // Check auth requirements
    const config = buildRequestConfig(cam);
    if (config.error) {
      return { content: [{ type: "text", text: config.error }], isError: true };
    }

    const filename = `${cam.id.substring(0, 30)}_${Date.now()}.jpg`.replace(/[^a-z0-9.]/gi, '_');
    const fullPath = path.join(SNAPSHOTS_DIR, filename);

    try {
      const response = await axios.get(config.url, { responseType: 'arraybuffer', timeout: 10000, headers: config.headers });
      const ct = response.headers['content-type'] || "";
      if (!ct.includes('image/')) throw new Error(`Not an image (content-type: ${ct})`);
      fs.writeFileSync(fullPath, Buffer.from(response.data));
      if (!fs.existsSync(fullPath)) throw new Error("No output file created.");
      return { content: [{ type: "text", text: `Snapshot captured: ${fullPath}` }] };
    } catch (e) { return { content: [{ type: "text", text: `Snapshot failed: ${e.message}` }], isError: true }; }
  }
);

// REGISTRY TOOLS
server.tool("list_webcams", "List all registered webcams.", {}, async () => {
  const all = [...CURATED_WEBCAMS, ...getCommunityData()];
  const logs = getValidationLog();
  if (all.length === 0) return { content: [{ type: "text", text: `v${VERSION} — Registry is empty. Use draft_webcam to add entries.` }] };

  const locations = {};
  for (const c of all) {
    const loc = c.location || "Unknown";
    locations[loc] = (locations[loc] || 0) + 1;
  }

  const locSummary = Object.entries(locations).sort((a, b) => b[1] - a[1])
    .map(([loc, count]) => `  ${loc}: ${count}`)
    .join("\n");

  const authRequired = all.filter(c => c.auth?.key_required).length;
  const authInfo = authRequired > 0 ? `\n\nAuth-required cameras: ${authRequired}` : "";

  const list = all.map(c => {
    const icon = (logs[c.id]?.status || "active") === "active" ? "+" : "-";
    const lock = c.auth?.key_required ? " [KEY]" : "";
    return `${icon} ${c.name} (${c.location}) — ID: ${c.id} [${c.category || "uncategorized"}]${lock}`;
  }).join("\n");

  return { content: [{ type: "text", text: `v${VERSION} Registry (${all.length} cameras):\n\n${locSummary}${authInfo}\n\n${list}` }] };
});

server.tool("search_webcams", "Search registry by name or location.", { query: z.string() }, async ({ query }) => {
  const all = [...CURATED_WEBCAMS, ...getCommunityData()];
  const results = all.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.location.toLowerCase().includes(query.toLowerCase()));
  if (results.length === 0) return { content: [{ type: "text", text: `No results for "${query}".` }] };
  return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
});

// DRAFT TOOLS
server.tool("draft_webcam", "Add a local unverified webcam entry.", {
  name: z.string(),
  url: z.string().url(),
  location: z.string(),
  timezone: z.string(),
  category: z.string().optional(),
  auth_provider: z.string().optional().describe("Provider name if API key is needed (e.g. 'Transport for London')"),
  auth_signup_url: z.string().optional().describe("URL to register for API key"),
  auth_key_required: z.boolean().optional().describe("Whether the image URL requires an API key"),
  auth_key_type: z.enum(["query_params", "header"]).optional().describe("How to inject the key"),
  auth_key_names: z.array(z.string()).optional().describe("Query param or header names for the key"),
  auth_config_key: z.string().optional().describe("Key name to use in ~/.eagleeye/config.json"),
  auth_note: z.string().optional().describe("Notes about authentication"),
}, async (params) => {
  const { auth_provider, auth_signup_url, auth_key_required, auth_key_type, auth_key_names, auth_config_key, auth_note, ...camFields } = params;

  const community = getCommunityData();
  const id = `comm-${Date.now()}`;

  const entry = {
    ...camFields,
    id,
    verified: false,
    submitted_at: new Date().toISOString(),
  };

  if (auth_provider) {
    entry.auth = {
      provider: auth_provider,
      signup_url: auth_signup_url || null,
      key_required: auth_key_required ?? true,
      ...(auth_key_type && { key_type: auth_key_type }),
      ...(auth_key_names && { key_names: auth_key_names }),
      ...(auth_config_key && { config_key: auth_config_key }),
      ...(auth_note && { note: auth_note }),
    };
  }

  community.push(entry);
  saveRegistry(community);
  return { content: [{ type: "text", text: `Drafted: ${camFields.name} (ID: ${id})${entry.auth ? ' [auth-required]' : ''}` }] };
});

server.tool("draft_webcam_report", "Save a local health report for a webcam.", {
  cam_id: z.string(),
  status: z.enum(["active", "offline", "broken_link", "low_quality"]),
  notes: z.string().optional()
}, async ({ cam_id, status, notes }) => {
  const cam = findWebcam(cam_id);
  if (cam && isNighttimeAt(cam.timezone)) return { content: [{ type: "text", text: "Report blocked: nighttime at webcam location." }], isError: true };
  const logs = getValidationLog();
  logs[cam_id] = { status, notes, timestamp: new Date().toISOString() };
  saveLog(logs);
  return { content: [{ type: "text", text: `Report saved for ${cam_id}.` }] };
});

// --- CONFIG TOOL ---
server.tool("get_config_info", "Show current configuration and API key status.", {}, async () => {
  const config = getUserConfig();
  const apiKeys = config.api_keys || {};
  const all = [...CURATED_WEBCAMS, ...getCommunityData()];

  const authCams = all.filter(c => c.auth?.key_required);
  const status = authCams.map(c => {
    const configKey = c.auth.config_key || c.auth.key_names?.[0];
    const hasKey = configKey && apiKeys[configKey];
    return {
      camera: c.name,
      provider: c.auth.provider,
      config_key: configKey,
      key_set: hasKey || false,
      signup_url: c.auth.signup_url,
    };
  });

  const info = [
    `Config: ${USER_CONFIG_PATH}`,
    `API keys configured: ${Object.keys(apiKeys).length}`,
    `Auth-required cameras: ${authCams.length}`,
  ];

  if (status.length > 0) {
    info.push("", "Auth status:");
    for (const s of status) {
      const icon = s.key_set ? "+" : "-";
      info.push(`  ${icon} ${s.camera} (${s.provider}) — key: ${s.config_key || "none"} ${s.key_set ? "SET" : "MISSING"}`);
    }
  }

  return { content: [{ type: "text", text: info.join("\n") }] };
});

// --- SYNC ---
server.tool("sync_registry", "Sync community data from GitHub.", {}, async () => {
  try {
    const [reg, logs] = await Promise.all([
      axios.get(`${GITHUB_RAW_BASE}/community-registry.json`),
      axios.get(`${GITHUB_RAW_BASE}/validation-log.json`).catch(() => ({ data: {} }))
    ]);
    saveRegistry(reg.data); saveLog(logs.data);
    return { content: [{ type: "text", text: "Registry synced." }] };
  } catch (e) { return { content: [{ type: "text", text: `Sync failed: ${e.message}` }], isError: true }; }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Eagle Eye v${VERSION}`);
}

main().catch(console.error);
