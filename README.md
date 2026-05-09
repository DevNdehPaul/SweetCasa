# SweetCasa

SweetCasa is a trusted real estate platform addressing the "fake agent" issue by combining AI-powered CASA-Match logic with a safe Document Vault. This helps landlords and tenants regain trust by making the housing connections safe, transparent, and reliable.

# How it works

When the user want to signup or login into the app, he or she is first prompted to choose a portal i.e a House Owner (Real Estate Agents or Landlord) or House Seeker (Buyer ot Tentant), and based on which portal is choosen the user is prompted to signup or login and is then granted successfull access to the app<img width="157" height="347" alt="image" src="https://github.com/user-attachments/assets/152f9928-6295-493c-bd75-e2f8687eb377" />

# Demo Video

https://drive.google.com/file/d/1oJ34CKlHUVOeGBcD3L9q6GMqq7yHvYOI/view?usp=drive_link

# App Features

# House Seekers

In the House Seekers Portal, we have the following tabs:

1. The Home tab ( House Seeker Dashboard): This is the central dashboard which displays a personalized greeting along with the house seeker's name & face with 4 quick-action cards which are Find House, Favourites, Neighborhood, Secure Wallet, as well as a Casa-Match AI banner, and a "Recommended for You" section listing properties that have been verified.<img width="313" height="708" alt="image" src="https://github.com/user-attachments/assets/706ab423-3f7f-4b9d-ac7a-0b850dc5523f" />

2. The Search Tab: This is an advanced filter for property searching. The system lets the user determine the location even at the level of a specific neighborhood. For example "Douala → Bonapriso". The user can select the listing status through 3 values: Available, Pending and Unavailable. The user may also decide among the following house types: Apartment, Studio, Villa, Office, Room, Duplex. Lastly, a conversion of the number of results to a live status is shown at the bottom.<img width="313" height="712" alt="image" src="https://github.com/user-attachments/assets/70f89d3d-da0e-4824-94bb-91cfc52c1ec9" />

3. The Message Tab: Here, the tenants and agents/landlords can chat via an in-app messaging feature. This presents a conversation thread where messages are exchanged in real time, with the display of timestamps and indicators showing when the messages have been read. There are also quick-action buttons available at the bottom (e.g. Schedule a viewing, Request location, Negotiate price).<img width="313" height="706" alt="image" src="https://github.com/user-attachments/assets/9598d06d-ead7-4345-a436-bebdeda812e0" />

4. The Escrow Wallet Tab: This is a secure escrow payment system which displays the user's overall balance, locked escrow funds, and available amount for withdrawal in XAF currency. It also allows deposit, withdrawal, and refund operations.<img width="316" height="712" alt="image" src="https://github.com/user-attachments/assets/f69c622f-019f-42cf-b417-246725c37b09" />

5. The User Profile Tab: This is the page displaying user's photo, role badge (House Seeker), saved and favorite counts, recently viewed properties, and options to switch to Agent Mode (to list properties and track leads) or manage Account Information and verification.<img width="315" height="709" alt="image" src="https://github.com/user-attachments/assets/242389bb-6b09-474b-a8eb-b98ff80123e4" />

# House Owners

In the House Owners Portal, we have the following tabs:

1. The Home tab ( House Owner Dashboard): This dashboard is designed for verified property owners and agents. It displays their escrow balance and pending payouts, lead conversion rate (14.2%), and count of unread leads (12), it also contains a quick action button to upload a new property, a live listings table with price and status (Active/Pending) of each property is also available.<img width="312" height="712" alt="image" src="https://github.com/user-attachments/assets/cb518295-2d20-4130-9ae9-66547d6dc3a4" />

2. The Upload Tab: This is the property listing form for real estate agents or landlords. It is divided into steps: Basic Info (property title and type: Apartment, Studio, Villa, Office, Room, Duplex, Guest House, Hotel), Location (from the country level to the neighborhood), Pricing, nearby facilities, etc. Agents have to complete this form to have a property live on the platform within minutes after verification of the property.<img width="310" height="711" alt="image" src="https://github.com/user-attachments/assets/b37c6cb8-5357-4990-86c4-dbbddfaf89c0" />

3. The Message Tab: Same thing as the House Seeker Portal.

4. The Escrow Wallet Tab: Same thing as the House Seeker Portal.

5. The User Profile Tab: Same thing as the House Seeker Portal, the only difference is that it doesn't have an option button to switch to Agent Mode.
  
# Project StructureSweetCasa/├── app/              # Screens and navigation (file-based routing via Expo Router)├── components/       # Reusable UI components├── constants/        # App-wide constants (colors, config, etc.)├── hooks/            # Custom React hooks├── scripts/          # Utility scripts├── sweetcasa-api/          # SweetCasa Express Backend Code├── assets/│   └── images/       # App images and icons├── app.json          # Expo app configuration├── eas.json          # EAS build configuration├── package.json      # Dependencies└── tsconfig.json     # TypeScript configuration# Conclusion for Last WeekSo far I have Completed the frontend of the App using the React-Native and also completed the authentication backend of the App using Express and Railway to deploy the backend code online and host my postgres database online<img width="845" height="334" alt="image" src="https://github.com/user-attachments/assets/fd679263-adf5-47c8-9c04-8339ae175519" /><img width="530" height="328" alt="image" src="https://github.com/user-attachments/assets/27e3be46-ec2d-43a7-9c61-ea078a722675" />So my Objective for this week is to complete the Backend Code responsible for uploading the house and their details entered by the House Owner and displaying it on the House Seeker Portal
