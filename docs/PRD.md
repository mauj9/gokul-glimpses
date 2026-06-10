# Product Requirements Document (PRD)
## Project Name: Gokul Glimpses (Balagokulam Seasonal Sharing App)

---

## 1. Executive Summary & Vision

**Gokul Glimpses** is a private, secure, mobile-first web platform designed to keep Balagokulam families and children connected during extended school breaks and holidays (e.g., Summer vacation, Diwali, Winter break). Mirroring the joyful, childhood spirit of Gokulam, the app allows children to share their vacation experiences, daily activities, and travel highlights with their local and national community via photos, videos, short audio clips ("Echoes"), and text notes. 

The platform provides a safe, interactive "wall of updates" that maps directly onto the organizational hierarchy of HSS, enabling both hyper-local engagement and national-level community building. It culminates in an automated interactive recap at the end of each holiday period.

---

## 2. Core Concepts & Terminology

* **Parvas / Leelas:** The overarching holiday timeline buckets for activities (e.g., *Summer Parva 2026*, *Diwali Leelas 2026*). All digital spaces and posts live inside a specific Parva.
* **The Organizational Hierarchy:** Content and user spaces are nested in a 3-tier structure matching the HSS organizational tree:
    * **Sambhag** (Zone) ➔ **Vibhag** (Region) ➔ **Shakha** (Local Chapter)
* **Spaces:** A dedicated digital stream/feed tied to a specific tier in the hierarchy for a given Parva (e.g., *Bay Area Vibhag Space* under the *Summer Parva 2026*).
* **The Walled Garden:** To ensure complete child privacy, **the entire app is locked behind authentication**. No content is indexable by search engines or viewable by unauthenticated users.

---

## 3. User Roles & Permission Matrix

| Role | Access & Capabilities |
| :--- | :--- |
| **Global Admin** | Full CRUD access to all Parvas, Spaces, Posts, User Profiles, and system audit logs across the entire application. Can promote users to Space Admins. |
| **Space Admin** | Created automatically when a user creates a space, or assigned by a Global Admin. Can manage a specific Space’s settings (e.g., instant posting vs. approval required), add other Space Admins via Google ID, and perform CRUD operations on all posts within their managed space. |
| **Parent / Poster** | Authenticates via Google. Can manage child profiles and perform CRUD operations *only* on posts created by their own children. |
| **Viewer** | Any user logged in with a valid Google account. Can view feeds, set a default space, and interact via emoji reactions. |

---

## 4. Functional Requirements

### 4.1 Onboarding & Profile Management
* **Authentication:** Users must sign in exclusively via **Google OAuth**. 
* **Parent-in-the-Loop Accounts:** Upon first login, an adult user acts as the parent account. They can create one or more **Child Profiles** containing:
    * First Name / Nickname
    * Age
    * City & State
* **Active Profile Switcher:** When posting content, the UI must allow the parent to easily switch between their children's profiles via a dropdown or profile selector.

### 4.2 Spaces & Hierarchical Architecture
* **Space Creation:** Available to authorized users via a dedicated administration route. 
* **Parent-Child Mapping:** Spaces must reflect the organizational tree. An update posted in a *Shakha Space* must dynamically bubble up and be queryable when viewing its parent *Vibhag Space* or grandparent *Sambhag Space*.
* **Space Visibility Settings:**
    * **Listed (Default):** Viewable by any logged-in user browsing the organizational tree.
    * **Unlisted/Private:** Hidden from the main navigation directory, accessible only to logged-in users who possess the direct URL.
* **Sticky Spaces ("Make Default"):** Users must have a one-click option to pin a specific Space as their "Home Space." Upon subsequent app launches, they are automatically navigated straight to this pinned space feed.

### 4.3 Content Creation & The Feed
* **Multi-Modal Posting:** Children can post updates containing:
    * Photos + Text + Audio Note ("Echo")
    * Video + Text
    * Single items (e.g., just a photo or just text)
* **Media Guardrails:**
    * **Audio/Video Caps:** Native browser recorders or file uploads must be strictly capped at a maximum duration of **30 seconds**.
    * **Optimization:** Implement client-side optimization/compression on images and video files prior to cloud storage upload to maintain excellent performance without sacrificing clear structural quality.
* **Moderation Workflow (Space-Level Setting):**
    * **Instant Go-Live (Default):** Posts appear in the stream immediately.
    * **Approval Required:** Posts enter a hidden queue until approved by a Space Admin or Global Admin.

### 4.4 Community Engagement & Reactions
* **Lightweight Interactions:** To eliminate comment moderation overhead, text replies are disabled.
* **Emoji Reaction Set:** Users can react to any post using exactly four fixed emoji expressions, including culturally relevant options:
    * Thumbs Up (👍)
    * Smiley Face (😄)
    * Heart (❤️)
    * Namaste / Pranam (🙏)

### 4.5 Dynamic Tagging & Filtering System
To keep the content organized and easily searchable, posts will utilize a hybrid tagging taxonomy that feeds directly into the replay engine.
* **Predefined Cultural & Travel Tags:** When creating a post, families can select from a set of fun, pre-loaded tags that blend vacation themes with cultural values:
    * 🛕 `#MandirDarshan` (Temples, historical sites, family prayers)
    * 😋 `#YummyBhojan` (Food adventures, traditional recipes, travel treats)
    * 🎒 `#SafarYatra` (Travel, road trips, flights, explore mode)
    * 🌳 `#Prakriti` (Nature, hiking, camping, appreciating wildlife)
    * 🎨 `#GokulKala` (Arts, crafts, drawing, creative holiday projects)
    * 🤸‍♂️ `#KhelMela` (Sports, outdoor games, summer camps, fun activities)
* **Custom User-Generated Tags:** Parents and kids can type and create their own custom hashtags (e.g., `#GrandmasHouse`, `#Monuments`).
* **Tag Guardrails:** Custom tags must be automatically stripped of special characters, limited to 20 characters maximum, and converted to lowercase to maintain database cleanliness. Space Admins have the rights to delete inappropriate custom tags.

### 4.6 The Replay & Recap Engine
* **Dynamic Stream Roll-Up:** The system must support a "Play Feed" interactive slideshow viewer. 
* **Scope-Aware Pulling:** Launching the Replay Engine from any tier of a Parva will automatically fetch and queue posts from that space *and all of its child spaces* combined. 
    * *Example:* Playing from a National Space pulls from all Sambhags; playing from a Vibhag space pulls from all nested Shakhas.
* **Tag-Targeted Playback:** Before clicking "Play," users can filter the stream by tags. For example, an instructor can launch the engine at the *Vibhag* level and select `#MandirDarshan` to play a continuous slideshow of all the temples the children visited over the summer across the entire region.
* **Playback Configurations:** Before launching a replay, users can toggle simple filters:
    * Playback order (Chronological vs. Randomized).
    * Content limits (e.g., "Show latest 20 updates").
* **Smart Transitions:** The replay flow should display the child's profile details (Name, Age, Shakha) clearly alongside the photo/video, playing the accompanying audio note seamlessly before automatically advancing to the next glimpse.

### 4.7 Audit Logs & System Analytics
* **Activity Ledger:** A strict backend log tracking all mutations: who created/updated/deleted a post, space, or admin configuration, and when. Accessible only to Global and Space Admins.
* **Engagement Tracking:** Aggregated, anonymous metrics tracking overall view/read events per space to give administrators insight into community participation and interest levels without compromising individual user privacy.

---

## 5. Visual Design & UI/UX Guidelines

To make the app inviting for kids while remaining deeply rooted in HSS values and Indian culture, the design should blend bright, festive summer tones with traditional motifs.

### 5.1 The Cultural Color Palette
The interface must avoid clinical whites and corporate blues. Instead, use a warm, energetic, and natural palette:
* **Primary Accent (Marigold / Kesari Orange):** Represents the festive spirit of India, warmth of the summer sun, and traditional HSS colors. Used for primary buttons and active states.
* **Secondary Accent (Peacock Blue):** Deeply tied to Sri Krishna (the core of Balagokulam) and refreshing summer water. Used for headers and navigation elements.
* **Backgrounds (Warm Soft Cream / Mango Yellow):** Easy on children's eyes, avoiding stark whites. Evokes a sense of old-world parchment, sunshine, and sweet summer mangoes.
* **Success/Nature (Pistachio Green):** Represents nature (*Prakriti*), travel, growth, and outdoor adventure. Used for tags and confirmations.

### 5.2 Kid-Centric UX Layout & Flow
Children expect high visual feedback and zero text complexity. The implementation should focus on the following primitives:
* **The "Chubby UI" Principle:** Use soft, heavily rounded corners (`border-radius: 16px` or greater) for all cards, buttons, and profile avatars to make the interface feel friendly and non-rigid.
* **Thumb-Friendly Bottom Navigation:** A persistent bottom navigation bar optimized for small hands on mobile devices:
    * *Left:* **Home Feed** (An open scroll of glimpses).
    * *Center (Prominent Floating Button):* **The "+" Post Button** (Launches the media selector immediately).
    * *Right:* **Gokul Replay** (The interactive slideshow engine).
* **Gamified Audio Recording:** When recording an "Echo" (audio note), show a playful, animating waveform or a bouncing peacock feather icon instead of a boring static timer so children know their voice is being captured.

---

## 6. Technical Stack Guidance (Flexible for Innovation)

> **Note to AI Coding Agent:** The following stack is suggested as a highly efficient, robust blueprint for this architecture. However, you are fully authorized and encouraged to propose alternative optimization strategies, framework improvements, or innovative architectural enhancements if they offer superior scale, performance, security, or developer velocity.

* **Framework:** Next.js (App Router) for hybrid rendering and swift deployment API routes.
* **Backend, Database & Auth:** Supabase (PostgreSQL for clean hierarchical execution, native Google OAuth, and Row-Level Security policy mapping for admin controls).
* **Cloud Media Storage:** Supabase Storage or Cloudflare R2 bucket configurations.