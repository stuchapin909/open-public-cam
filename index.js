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
const USER_CONFIG_DIR = path.join(os.homedir(), ".openeagleeye");
const USER_CONFIG_PATH = path.join(USER_CONFIG_DIR, "config.json");

// Version 6.0.0 — Renamed to Open Eagle Eye, npm: openeagleeye
const VERSION = "6.0.0";

// GitHub Constants
const GITHUB_OWNER = "stuchapin909";
const GITHUB_REPO = "Open-Eagle-Eye";
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
//     config_key: "TFL_API_KEY",              // Key name in ~/.openeagleeye/config.json
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
    id: "tfl-00001.09731",
    name: "A1 Barnet Wy/Barnet Ln",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09731.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09740",
    name: "A1/A504 Finchley Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09740.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09741",
    name: "A1/Holders Hill",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09741.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01445",
    name: "A10 Grt Cambridge Rd/A110 S bury Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01445.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04005",
    name: "A102 Blackwall Tunnel Sth Appr",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04005.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00344",
    name: "A102 Shooters Hill",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00344.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00345",
    name: "A102 Woolwich Rd (S)",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00345.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01603",
    name: "A107 Upper Clapton Rd/Southwold Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01603.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08100",
    name: "A118 Romford Rd/A406 Ncr",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08100.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00810",
    name: "A12 East Cross Route",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00810.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02420",
    name: "A12 Eastern Av/Barley Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02420.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00840",
    name: "A12 GGT W Appr 4002A",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00840.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00838",
    name: "A12 GMT E Appr 3969L",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00838.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00816",
    name: "A12 Wick Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00816.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00851",
    name: "A12/M11 Redbrdg 100A",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00851.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00852",
    name: "A12/M11 Redbrdg 100A",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00852.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00850",
    name: "A12/Preston Drive",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00850.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00421",
    name: "A13 Branch Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00421.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00330",
    name: "A13 Burdett Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00330.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02258",
    name: "A13 Commercial Road/Salmon Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02258.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00333",
    name: "A2 Arbuthnot Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00333.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00334",
    name: "A2 Danson",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00334.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00252",
    name: "A2 Eltham West E/B",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00252.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00254",
    name: "A2 Eltham West W/B",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00254.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00343",
    name: "A2 Kidbrooke Junction",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00343.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03672",
    name: "A2 New Cross Rd/Avonley Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03672.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03660",
    name: "A2 New Cross Rd/Besson St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03660.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03659",
    name: "A2 New Cross Rd/Billington Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03659.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03664",
    name: "A2 New Cross Rd/Florence Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03664.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03674",
    name: "A2 New Cross Rd/Lewisham Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03674.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03662",
    name: "A2 New Cross Rd/Nettleton Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03662.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03663",
    name: "A2 New Cross Rd/St James",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03663.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00342",
    name: "A2 Westhorne Avenue",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00342.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03700",
    name: "A20 Lewisham Way/Parkfield Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03700.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03764",
    name: "A20 Sidcup Rd/Coyler Close",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03764.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03753",
    name: "A205 / Catford Hill",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03753.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03748",
    name: "A205 Academy Rd/Shooters Hill",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03748.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03762",
    name: "A205 Christchurch Rd/A23 Brixton H",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03762.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03778",
    name: "A205 Christchurch Rd/Norwood Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03778.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03757",
    name: "A205 E of Sydenham Hill",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03757.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06726",
    name: "A205 Kew Rd/Kew Green",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06726.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03756",
    name: "A205 London Rd/Dartmouth Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03756.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06717",
    name: "A205 Mortlake Rd/Bessant Drive",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06717.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03750",
    name: "A205 north of Broad Walk",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03750.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03770",
    name: "A205 Poynders Rd/Kings Ave",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03770.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03758",
    name: "A205 Tulse Hill/ Thurlow Park Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03758.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06716",
    name: "A205 Upper Rmond Rd/Carlton Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06716.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06625",
    name: "A205 Upper RMond Rd/Sheen Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06625.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03754",
    name: "A205 W of Brockley Rise",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03754.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03755",
    name: "A205 Waldram Pk Rd/Westbourne Dr",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03755.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03720",
    name: "A205 Westhorne Av/Sidcup Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03720.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03749",
    name: "A205 Woolwich Common Rd/Ngale pl",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03749.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03817",
    name: "A21 Bromley Rd/Bellingham Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03817.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03816",
    name: "A21 Bromley Rd/Callander Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03816.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03815",
    name: "A21 Bromley Rd/Newquay Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03815.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03813",
    name: "A21 Bromley Rd/Penerley Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03813.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03803",
    name: "A21 North of Davenport Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03803.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03805",
    name: "A21 Rushey Grn/Ringstead Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03805.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04575",
    name: "A217 / Rose Hill R.bout",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04575.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04150",
    name: "A22 Godstone Rd/Dale Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04150.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04534",
    name: "A23 Brixton Rd/Hillyard St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04534.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04535",
    name: "A23 Brixton Rd/Ingleton St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04535.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04526",
    name: "A23 Brixton Rd/Stockwell Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04526.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04523",
    name: "A23 Brixton Rd/Vassell Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04523.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04536",
    name: "A23 Brixton Rd/Wynne Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04536.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04568",
    name: "A23 Purley Way/Edgehill Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04568.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04567",
    name: "A23 Purley Way/Queensway",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04567.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04561",
    name: "A23 south of Thornton Ave",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04561.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04518",
    name: "A23 Streatham H Rd/Colmer Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04518.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04533",
    name: "A23 Streatham H Rd/Heathdene Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04533.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04515",
    name: "A23 Streatham H Rd/Hopton Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04515.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04530",
    name: "A23 Streatham H Rd/Kingscourt Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04530.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04514",
    name: "A23 Streatham H Rd/Mitcham Ln",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04514.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04524",
    name: "A23 Streatham H Rd/Stanthorp Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04524.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04528",
    name: "A23 Streatham H/Barrhill Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04528.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04519",
    name: "A23/Commerce Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04519.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04520",
    name: "A23/Epsom Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04520.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04569",
    name: "A23/Old Lodge Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04569.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04521",
    name: "A23/Stafford Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04521.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04377",
    name: "A232 / Sutton Court Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04377.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07378",
    name: "A232 Grove Rd/Sutton Park Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07378.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04655",
    name: "A24 Morden Rd/Dorset Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04655.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04654",
    name: "A24 Morden Rd/Merantun Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04654.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04621",
    name: "A3 Clapham High St/Aristotle Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04621.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04611",
    name: "A3 Clapham Rd/Caldwell St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04611.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04610",
    name: "A3 Clapham Rd/Crewdson Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04610.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04608",
    name: "A3 Clapham Rd/Elias Place",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04608.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04609",
    name: "A3 Clapham Rd/Handforth Street",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04609.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04616",
    name: "A3 Clapham Rd/Lingham St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04616.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04613",
    name: "A3 Clapham Rd/Stockwell Park Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04613.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04614",
    name: "A3 Clapham Rd/Stockwell Rd/Landsdowne Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04614.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04620",
    name: "A3 Clapham Road/B221 Bedford Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04620.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04618",
    name: "A3 Clapham Road/Mayflower Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04618.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04627",
    name: "A3 East Of Garratt Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04627.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04629",
    name: "A3 East Of West Hill",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04629.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04684",
    name: "A3 Kingston Bypass/South Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04684.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04646",
    name: "A3 Roehampton Vale/A308 Robin Hood",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04646.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04642",
    name: "A3 Tibett Crn/Withycombe Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04642.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04637",
    name: "A3 West Hill/Up Richmond Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04637.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06750",
    name: "A30 Hatton Cross",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06750.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06738",
    name: "A312 Hampton Rd York Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06738.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04281",
    name: "A3205 BATTERSEA PK RD - SAVONA ST",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04281.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06921",
    name: "A4 Bath Rd/The Avenue",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06921.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06648",
    name: "A4 Chiswick Roundabout",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06648.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06948",
    name: "A4 Colnbrook/Stanwell Moor Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06948.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06910",
    name: "A4 Great West Rd/A3063 Sutton Ln",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06910.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06605",
    name: "A4 Great West Rd/Sutton Crt Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06605.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06506",
    name: "A4 West of Sipson Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06506.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07310",
    name: "A40 / Near Connell Crescent",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07310.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07325",
    name: "A40 Western Ave/Gibbon Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07325.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07320",
    name: "A40 Western Ave/Long Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07320.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07326",
    name: "A40 Westway/Paddington Grn",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07326.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07302",
    name: "A40(M) Eastern End",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07302.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07303",
    name: "A40(M) Paddington Slip",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07303.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07317",
    name: "A40/Hanger Lane Tunnel",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07317.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07308",
    name: "A40/Wales Farm Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07308.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00113",
    name: "A406 / Harrow Rd / Brentfield",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00113.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00869",
    name: "A406 Angel Road East",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00869.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00865",
    name: "A406 Billet Upass E",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00865.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00866",
    name: "A406 Billet Upass W",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00866.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00110",
    name: "A406 Brentfield Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00110.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00868",
    name: "A406 Cooks Ferry R/B",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00868.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08300",
    name: "A406 CROOKED BILLET",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08300.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00867",
    name: "A406 Golf Range",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00867.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00116",
    name: "A406 Iveagh Ave",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00116.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00870",
    name: "A406 Montagu Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00870.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09049",
    name: "A406 NCR Henlys Corner",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09049.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08009",
    name: "A406 NCR/Grt Central Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08009.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00107",
    name: "A406 Neasden Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00107.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09060",
    name: "A406 North Circular Rd/Telford Rd/Bounds Green Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09060.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09050",
    name: "A406/A1 Falloden Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09050.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09064",
    name: "A406/Bowes Rd/Green Lanes",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09064.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09051",
    name: "A406/Great North Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09051.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09061",
    name: "A406/Telford Rd/Bowes Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09061.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08003",
    name: "A4088 Forty Av/Bridge Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08003.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07929",
    name: "A41 Hendon Way/Cricklewood Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07929.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08959",
    name: "A41 Sth of Fortune Grn Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08959.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08855",
    name: "A5 Edgware Rd/Broadley St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08855.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07360",
    name: "A501 East of Melton St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07360.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07358",
    name: "A501 W of Mabledon Place",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07358.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07365",
    name: "A501 W of Park Sq East",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07365.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09054",
    name: "A504 Est End Rd/A406 Nth Circ Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09054.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04255",
    name: "Albert Emb/Glasshouse Wk",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04255.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04254",
    name: "Albert Emb/Tinworth St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04254.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09716",
    name: "Archway Gyr/Holloway Rd/Jnc Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09716.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09718",
    name: "Archway Rd/Gladsmuir Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09718.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03950",
    name: "Baring Rd/Le May Avenue",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03950.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02307",
    name: "Barking Rd / W of Bartle Ave",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02307.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02301",
    name: "Barking Rd/Chargable Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02301.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02315",
    name: "Barking Rd/Green St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02315.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02314",
    name: "Barking Rd/Prince Regent Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02314.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06923",
    name: "Bath Rd / Oxford Ave",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06923.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06551",
    name: "Battersea Bridge/Cheyne Wk",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06551.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04632",
    name: "Battersea Pk Rd/Prince of Wales Dr",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04632.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06660",
    name: "Bayswater Rd/Lancaster Terrace",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06660.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00625",
    name: "Beckton West",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00625.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03609",
    name: "Blackfriars Rd/Dolben St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03609.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03675",
    name: "Blackheath Rd/Greenwich High Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03675.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03670",
    name: "Blackheath Rd/Wickes Store",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03670.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02110",
    name: "Bow Rd/Alfred St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02110.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01436",
    name: "Bowes Rd/Brownlow Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01436.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04573",
    name: "Brighton Rd A23 Coulsdon Bypass",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04573.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04572",
    name: "Brighton Rd/Farthing Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04572.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04407",
    name: "Brighton Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04407.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04511",
    name: "Brixton Hill / Elm Park",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04511.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04510",
    name: "Brixton Hill /Lambert Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04510.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04512",
    name: "Brixton Hill/Morrish Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04512.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04505",
    name: "Brixton Rd/Island Place",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04505.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04507",
    name: "Brixton Rd/Stockwell Pk",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04507.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02205",
    name: "Burdett Rd/Dod St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02205.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02202",
    name: "Burdett Rd/Eric St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02202.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02201",
    name: "Burdett Rd/Hamlets Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02201.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02200",
    name: "Burdett Rd/Mile End Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02200.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02204",
    name: "Burdett Rd/Pixley St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02204.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00857",
    name: "C/Browns E/B Off-Slip",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00857.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00856",
    name: "C/Browns/M11 Split",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00856.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09630",
    name: "Caledonian R/Caledonia S",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09630.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09631",
    name: "Caledonian R/Copnhagen S",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09631.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04335",
    name: "Camberwell N/Rd/Camberwell Pas",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04335.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04503",
    name: "Camberwell New Rd/Brixton Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04503.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04333",
    name: "Camberwell New Rd/Foxley Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04333.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04343",
    name: "Camberwell New Rd/Lotian Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04343.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04339",
    name: "Camberwell New Rd/Vassall Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04339.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03825",
    name: "Camberwell Rd/Albany Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03825.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09619",
    name: "Camden Rd N Of Camden Pk Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09619.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09603",
    name: "Camden Rd/Hillmarton Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09603.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03763",
    name: "Catford Hill/Dogget Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03763.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03752",
    name: "Catford One Way/Rushey Green",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03752.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06620",
    name: "Chalkers Corner",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06620.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07551",
    name: "Charing Cross Rd / Cambridge Circus",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07551.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07550",
    name: "Charing Cross Rd/Cranbourne St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07550.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00854",
    name: "CHARLIE BROWNS ROUNDABOUT",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00854.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06647",
    name: "Chiswick Roundabout (Northside)",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06647.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07354",
    name: "City Rd by Central St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07354.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02257",
    name: "Commercial Rd/Belgrave St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02257.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02254",
    name: "Commercial Rd/Cannon St Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02254.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02255",
    name: "Commercial Rd/Dean Cross St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02255.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02256",
    name: "Commercial Rd/Jubilee St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02256.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02253",
    name: "Commercial Rd/New Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02253.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02269",
    name: "Commercial Rd/Westport St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02269.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02310",
    name: "Connaught Bridge/Connaught Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02310.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03721",
    name: "Court Rd/Sidcup Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03721.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08600",
    name: "Craven Rd/Eastborne Terrace",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08600.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03223",
    name: "Crayford Rd/Crayford Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03223.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06598",
    name: "Cromwell Rd/Collingham Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06598.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06600",
    name: "Cromwell Rd/Earls Court Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06600.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04672",
    name: "Crown Lane/Grasmere Avenue",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04672.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04376",
    name: "Croydon Flyover/Fell Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04376.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03665",
    name: "Deptford Broadway/Deptford Ch St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03665.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00341",
    name: "DURSLEY ROAD",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00341.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06586",
    name: "Earls Crt Rd/Earls Crt Station",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06586.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02259",
    name: "East India Dock Rd/Amoy Pl",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02259.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02433",
    name: "Eastern Ave / Gallows Corner",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02433.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08861",
    name: "Edgeware Rd/Madia Ave",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08861.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03718",
    name: "Eltham Rd/Sidcup Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03718.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07387",
    name: "Euston Rd/Conway St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07387.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07356",
    name: "Euston Rd/Grays Inn Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07356.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07361",
    name: "Euston Rd/Tottenham Court Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07361.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03556",
    name: "Evelyn Street / Bestwood St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03556.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09738",
    name: "Falloden Way/Northway/Hill Rise",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09738.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03835",
    name: "Farnborough Common/Croydon Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03835.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03600",
    name: "Farringdon Rd opp Ray St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03600.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03608",
    name: "Farringdon Rd/Cowcross St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03608.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00635",
    name: "Ferry Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00635.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09056",
    name: "Finchley High Rd/A406",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09056.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08961",
    name: "Finchley Rd Sth of Rosemont Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08961.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09642",
    name: "Finchley Rd/Alvanley Grdns",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09642.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09641",
    name: "Finchley Rd/Langland Grdns",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09641.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08958",
    name: "Finchley Road / West End Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08958.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08960",
    name: "Finchley Road/Hendon Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08960.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.05832",
    name: "Fulham BWay Wst of Harwood Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.05832.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.05827",
    name: "Fulham Palace Rd(Coroners Crt)",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.05827.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.05829",
    name: "Fulham Palace Rd/Lillie Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.05829.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.05826",
    name: "Fulham Palace Rd/Lysia St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.05826.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.05900",
    name: "Fulham Rd/Redcliffe Gardens",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.05900.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00858",
    name: "Gates Br/Waterworks E",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00858.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00632",
    name: "Goresbrook West",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00632.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09701",
    name: "Goswell Rd Opp Owen St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09701.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03747",
    name: "Grand Depot Rd/John Wilson St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03747.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09640",
    name: "Grays Inn Rd / Acton St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09640.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06908",
    name: "Great West Rd / Thornbury Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06908.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01429",
    name: "Grt Cambridge Rd/Bullsmore Ln",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01429.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08005",
    name: "Grt Central Way/Drury Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08005.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08010",
    name: "Gunnersbury Ave/Gunnersbury Drive",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08010.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07553",
    name: "H.Stead Rd/Cardington St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07553.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07552",
    name: "H.Stead Rd/Drummond St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07552.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01685",
    name: "Hackney Rd/Camb Heath Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01685.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07311",
    name: "Hanger Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07311.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08001",
    name: "Hanger Lane/Queens Parade",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08001.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08000",
    name: "Hanger Lane/Uxbridge Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08000.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04329",
    name: "Harleyford Rd/Vauxhall Grove",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04329.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04332",
    name: "Harleyford St/Ken Pk Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04332.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07375",
    name: "Harrow Rd/Grt Western Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07375.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07376",
    name: "Harrow Rd/Kilburn Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07376.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07322",
    name: "Harrow Rd/Lord Hills Bridge",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07322.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07321",
    name: "Harrow Rd/Westbourne Terrace",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07321.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03865",
    name: "Herne Hill/Norwood Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03865.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09755",
    name: "High Rd Wood Grn-Ewart Grove",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09755.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04901",
    name: "High St/Station way/The Cheam",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04901.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09723",
    name: "Holloway Rd Nth Rupert Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09723.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09708",
    name: "Holloway Rd Nth/Furlong Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09708.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09710",
    name: "Holloway Rd Nth/Tollington Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09710.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09709",
    name: "Holloway Rd Sth/Fieldway Cres",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09709.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09707",
    name: "Holloway Rd/Highbury Corner",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09707.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09712",
    name: "Holloway Rd/Tufnell Pk Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09712.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01606",
    name: "Homerton High St/Digby Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01606.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04235",
    name: "Horseferry Rd/Marsham St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04235.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06624",
    name: "Hospital Bridge Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06624.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04345",
    name: "Kenington Pk Rd/Kennington Oval",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04345.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04300",
    name: "Kennington Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04300.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04303",
    name: "Kennington Lane/Kennington Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04303.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04604",
    name: "Kennington Lane/Newington Butts",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04604.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04305",
    name: "Kennington Ln/Chester Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04305.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04304",
    name: "Kennington Ln/Vauxhall St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04304.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04331",
    name: "Kennington Oval",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04331.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04606",
    name: "Kennington Pk Rd/Braganza St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04606.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04607",
    name: "Kennington Pk Rd/Kennington Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04607.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04605",
    name: "Kennington Pk Rd/Penton Pl",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04605.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04500",
    name: "Kennington Rd/Kennington Grn",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04500.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06609",
    name: "Kensington Hi St/Warwick Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06609.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03810",
    name: "Kentish Way N of Masons Hill",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03810.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01611",
    name: "Kenworthy Rd/Brookfield Rd/Wick Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01611.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06710",
    name: "Kew Bridge Northside",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06710.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.05975",
    name: "Kew Rd/Mortlake Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.05975.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03591",
    name: "Kings X Rd / Swinton St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03591.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03590",
    name: "Kings X Rd / Wharton St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03590.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07600",
    name: "Kingsway/High Holborn",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07600.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02342",
    name: "Lea Bridge Rd/Markhouse Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02342.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09088",
    name: "Lea Valley/Cabinet Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09088.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03705",
    name: "Lewisham Way/Florence Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03705.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00389",
    name: "Limehouse Tnl East Portal E/B",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00389.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00378",
    name: "Limehouse Tnl HH Westferry Rd Exit",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00378.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00403",
    name: "Limehouse Tnl Westferry Rd Entr",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00403.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00361",
    name: "Limehouse Tunnel/Butcher Row",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00361.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00629",
    name: "Lodge Avenue",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00629.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04540",
    name: "London Rd/Wharfedale Gardens",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04540.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04545",
    name: "London Road/Raymead Avenue",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04545.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03901",
    name: "Lordship Ln/Dulwich Cmn",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03901.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01605",
    name: "Lower Clapton Rd/Rowhill Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01605.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03557",
    name: "Lower Rd/Rotherhithe Old Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03557.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01432",
    name: "Lr Clapton Rd/Thislewaite Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01432.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01601",
    name: "Lwr Clapton/Powerscroft",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01601.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06619",
    name: "Lwr Mortlake Rd/Manor Circus",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06619.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00853",
    name: "M11/A406 N/Bnd 109A",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00853.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08865",
    name: "Maida Vale/St Johns Wood Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08865.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01502",
    name: "Mare St/Graham Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01502.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07391",
    name: "Marylebone Rd/Great Portland Street",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07391.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07364",
    name: "Marylebone Rd/Osnaburgh St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07364.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02109",
    name: "Mile End Rd/Cambridge Heath Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02109.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02105",
    name: "Mile End Rd/Cephas Ave",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02105.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02115",
    name: "Mile End Rd/Globe Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02115.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02106",
    name: "Mile End Rd/Harford St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02106.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00628",
    name: "Movers Lane East",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00628.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08006",
    name: "Neasden Ln North/A406",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08006.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.05752",
    name: "New Kings Rd/Wanworth Brg Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.05752.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04275",
    name: "Nine Elms",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04275.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04279",
    name: "Nine Elms Ln/Cringle St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04279.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04277",
    name: "Nine Elms Ln/Ponton Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04277.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04276",
    name: "Nine Elms Ln/Wandsworth Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04276.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00623",
    name: "Noel Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00623.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06602",
    name: "North End Rd/Talgarth Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06602.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07500",
    name: "Northumberland Ave/Victoria Emb",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07500.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06408",
    name: "Notting Hill Gate/Palace Grdns Ter",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06408.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06580",
    name: "Old Brompton Rd / Earls Court Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06580.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06581",
    name: "Old Brompton Rd/Finboro Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06581.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03657",
    name: "Old Kent Rd/Peckham Pk R",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03657.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03656",
    name: "Old Kent Rd/St James Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03656.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00338",
    name: "PARK MEAD",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00338.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03668",
    name: "Peckham Hg St wof Clayton Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03668.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06587",
    name: "Pembroke Rd/Cromwell Crescent",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06587.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07355",
    name: "Pentonville Road / Penton Rise",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07355.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07450",
    name: "Piccadilly Circus",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07450.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06592",
    name: "Piccadilly/St James St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06592.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00631",
    name: "Pooles Lane West",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00631.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00622",
    name: "Prince Regents Lane E",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00622.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00621",
    name: "Prince Regents Lane Jn",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00621.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00620",
    name: "Prince Regents Lane W",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00620.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04564",
    name: "Purley Way/Croydon Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04564.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04563",
    name: "Purley Way/Newman Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04563.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04562",
    name: "Purley Way/Waddon Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04562.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.05825",
    name: "Putney High St/Lwr Richmond Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.05825.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04348",
    name: "Queens Rd/Pomeroy St/Lausanne Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04348.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04344",
    name: "Queens Road/Woods Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04344.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04641",
    name: "Queenstwn Rd/Chelsea Bridge",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04641.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00636",
    name: "Rainham Marshes",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00636.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07451",
    name: "Regent St/Conduit St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07451.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02158",
    name: "Romford Rd / Carlton Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02158.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02156",
    name: "Romford Rd / Green St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02156.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02154",
    name: "Romford Rd / Sprowston Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02154.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02160",
    name: "Romford Rd/ Rabbits Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02160.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00884",
    name: "ROMFORD ROAD",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00884.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01551",
    name: "Rosebery Av/Mount Pleasant",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01551.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01615",
    name: "Ruckholt Rd/Sherrin Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01615.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03821",
    name: "Rushy Green/Rosenthal Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03821.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07379",
    name: "Scrubs Lane/North Pole Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07379.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09607",
    name: "Seven Sisters Rd by Fonthill Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09607.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09622",
    name: "Seven Sisters Rd Op Yonge Pk",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09622.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09609",
    name: "Seven Sisters Rd/Alexandria Grove",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09609.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09620",
    name: "Seven Sisters Rd/Barrow Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09620.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09711",
    name: "Seven Sisters Rd/Holloway Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09711.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09608",
    name: "Seven Sisters Rd/Wilberforce Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09608.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09621",
    name: "Sevn Sistrs Rd/Blackstock Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09621.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07458",
    name: "Shaftesbury Ave / Macclesfield St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07458.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07300",
    name: "Shaftesbury Ave/High Holborn",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07300.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06723",
    name: "Sheen Lane/Larches Av",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06723.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03205",
    name: "Shooters Hill Rd/Charlton Pk Ln",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03205.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03760",
    name: "Shooters Hill Rd/P o wales Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03760.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04473",
    name: "South Lambeth Rd/Miles St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04473.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04476",
    name: "South Lambeth Rd/Parry St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04476.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04474",
    name: "South Lambeth Rd/Tradescant Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04474.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07590",
    name: "Southampton Row/Vernon Place",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07590.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06518",
    name: "St Georges Sq/Lupus St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06518.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07301",
    name: "St Giles Circus",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07301.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04565",
    name: "Stafford Rd/Epsom Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04565.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04220",
    name: "Stamford St/Broadwall",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04220.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03765",
    name: "Stanstead Rd/Blythe Hill Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03765.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04477",
    name: "Stockwell Rd By Clapham Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04477.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04486",
    name: "Stockwell Rd/Chantrey Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04486.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04485",
    name: "Stockwell Rd/Stockwell Ln",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04485.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04675",
    name: "Stonecot Hill/Hill Top",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04675.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06590",
    name: "Strand/Lancaster Place",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06590.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06584",
    name: "Tadema Rd Sth Kings Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06584.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06603",
    name: "Talgarth Rd/Butterwick",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06603.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06693",
    name: "The Broadway/St.Georges Av",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06693.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06686",
    name: "The Broadway/Windsor Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06686.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02352",
    name: "The Highway/Glamis Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02352.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02353",
    name: "The Highway/Wapping Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02353.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07591",
    name: "Theobalds Rd/Boswell St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07591.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04560",
    name: "Thornton Rd/Broughton Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04560.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03902",
    name: "Thurlow Park Road/Croxted Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03902.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07390",
    name: "Tottenham Court Rd/Grafton Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07390.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06502",
    name: "Trafalgar Square",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06502.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03808",
    name: "Tweedy Rd E of Sherman Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03808.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03809",
    name: "Tweedy Rd N of Widmore Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03809.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07389",
    name: "University St/Gower St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07389.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.01604",
    name: "Upper Clapton Rd/Rossington St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.01604.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06712",
    name: "Upper Rmond Rd/Clifford Ave",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06712.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09703",
    name: "Upper St Nth/Duncan St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09703.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09705",
    name: "Upper St/Highbury Corner",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09705.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06692",
    name: "Uxbridge Rd/Park View Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06692.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06697",
    name: "Uxbridge Road/Greenford Road",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06697.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04324",
    name: "Vauxhall B Rd N Rampayne St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04324.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04328",
    name: "Vauxhall Brd Rd/Drummond Gt",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04328.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04322",
    name: "Vauxhall Brd Rd/Stanford St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04322.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04256",
    name: "Vauxhall Cross",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04256.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02500",
    name: "Victoria Embkmt/Temple Place",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02500.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06585",
    name: "Warwick Rd/Earls Crt Station",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06585.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.06601",
    name: "Warwick Rd/W Cromwell Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.06601.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04223",
    name: "Waterloo Bridge south",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04223.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00859",
    name: "Waterworks E/B On-Slip",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00859.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00860",
    name: "Waterworks W/B Off-Slip",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00860.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04644",
    name: "West Hill/Portinscale Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04644.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03761",
    name: "Westhorn Av E of Burnt Ash Hill",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03761.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.09650",
    name: "White Lion St / Upper St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.09650.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02102",
    name: "Whitechapel Rd / Plumbers Row",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02102.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.02103",
    name: "Whitechapel Rd/Court St",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.02103.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.07305",
    name: "Wood Lane/A40 Westway",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.07305.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.08402",
    name: "Woodford Ave / Clayhall Ave",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.08402.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00002.00624",
    name: "Woolwich Manor Way",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00002.00624.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03111",
    name: "Woolwich Rd/A102 Flyover",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03111.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: true,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03115",
    name: "Woolwich Rd/Charlton Church Lane",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03115.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.03118",
    name: "Woolwich Rd/Warspite Rd",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.03118.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04676",
    name: "Wworth High St/Wworth Plain",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04676.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
  },
  {
    id: "tfl-00001.04226",
    name: "York Road/Leake Street",
    url: "https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/00001.04226.jpg",
    category: "city",
    location: "London, UK",
    timezone: "Europe/London",
    verified: false,
    auth: {"provider":"Transport for London","signup_url":"https://api-portal.tfl.gov.uk/signup","key_required":false,"note":"API key only needed for camera discovery, not for image access. Images are served from public S3."}
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
      const response = await axios.get(config.url, { responseType: 'arraybuffer', timeout: 10000, headers: config.headers, maxContentLength: 5 * 1024 * 1024, maxBodyLength: 5 * 1024 * 1024 });
      const ct = response.headers['content-type'] || "";
      if (!ct.includes('image/')) throw new Error(`Not an image (content-type: ${ct})`);
      const buf = Buffer.from(response.data);
      if (buf.length > 5 * 1024 * 1024) throw new Error(`Response too large (${(buf.length / 1024 / 1024).toFixed(1)}MB, max 5MB)`);
      fs.writeFileSync(fullPath, buf);
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
  auth_config_key: z.string().optional().describe("Key name to use in ~/.openeagleeye/config.json"),
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
    if (!Array.isArray(reg.data)) throw new Error("Invalid registry data: expected array");
    if (typeof logs.data !== "object" || Array.isArray(logs.data)) throw new Error("Invalid log data: expected object");
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
