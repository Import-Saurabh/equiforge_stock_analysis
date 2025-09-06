📈 EquiForge – Stock Analysis Platform (In Development)
EquiForge is an AI-powered stock analysis web application focused on the Indian stock market.
The platform combines financial data scraping, AI-driven insights, and interactive dashboards to help investors make informed decisions.

⚠️ Note: This project is still under active development. Features, models, and architecture are being refined and expanded.

✨ Planned Features
Stock Data Integration

Live market data (Sensex, Nifty50, Bank Nifty, Midcap, etc.)

Historical stock price storage (5+ years)

Balance sheet, income statement, and cashflow scraping from MoneyControl

AI-Powered Analysis

Buy/Sell/Hold predictions using machine learning

Financial ratio calculations (P/E, ROE, Debt-to-Equity, etc.)

Future roadmap: Warren Buffett & Benjamin Graham–style fundamental analysis

User Dashboard

Secure login with JWT authentication

Explore page with stock cards and peer comparisons

Interactive graphs for financial statements

🏗️ System Architecture
EquiForge follows a modular microservice-inspired architecture combining Node.js and Python:

Frontend (React + TailwindCSS)

User interacts via search, stock dashboards, and charts.

Sends requests to the backend API using fetch/axios.

Backend (Node.js + Flask/FastAPI as fallback)

Node.js (Express): Handles most API requests, authentication, and database queries.

Python Services (Flask/FastAPI): Used for ML predictions and financial scraping fallback when Yahoo Finance APIs fail.

Database (MySQL)

Stores stock prices, balance sheets, income statements, cashflow, and ratios.

Historical price data fetched via yfinance.

Request Flow

🛠️ Technologies Used
Frontend

React.js – Component-based UI

TailwindCSS – Styling framework

Recharts – Data visualization (charts & graphs)

Axios – API requests

Backend

Node.js (Express) – Main backend & APIs

Flask / FastAPI – Python fallback for ML & scraping

yfinance – Stock price fetching

BeautifulSoup & Selenium – Financial statement scraping from MoneyControl

Database

MySQL – Relational storage for financial data

Machine Learning & Analytics

Scikit-learn – Model training & prediction

Pandas, NumPy – Data processing

🛠️ Current Progress
✅ Scraping balance sheet, income statement, and cashflow data from MoneyControl

✅ Historical stock price storage (NSE & BSE)

✅ React frontend (Explore page, index cards, search & filtering)

✅ Flask APIs for financial data serving

🚧 Migration to Node.js backend (in progress)

🚧 AI model design and integration (in progress)

🚧 Secure authentication & user dashboards (planned)

📊 Dataset Sources
MoneyControl.com – Company financial statements

Yahoo Finance – Stock price history & index data

Custom Scrapers – Built with Selenium, BeautifulSoup, and yfinance

🚀 Roadmap
Complete migration to Node.js backend

Dockerize Python FastAPI ETL services

Integrate AI prediction models into the backend

Build full-featured React dashboard with peer comparisons

Deploy production-ready version

📌 Disclaimer
This project is for educational and research purposes only.
It is not intended as financial advice. Always do your own research before investing.

🖼️ Project Images
Application Interface
<p align="center"> <img src="EquiForge Logo.png" alt="EquiForge Logo" width="400"/> </p><p align="center"> <img src="BIF.png" alt="Top Gainers and Losers" width="700"/> </p><p align="center"> <img src="balance-sheet.png" alt="Balance Sheet Visualization" width="700"/> </p><p align="center"> <img src="Screenshot 2025-09-06 160538.png" alt="Market Overview" width="700"/> </p><p align="center"> <img src="Screenshot 2025-09-06 160616.png" alt="Stock Performance" width="700"/> </p><p align="center"> <img src="Screenshot 2025-09-06 160631.png" alt="Financial Metrics" width="700"/> </p>
Development Progress
<p align="center"> <img src="Screenshot 2025-09-06 160932.png" alt="Project Structure" width="700"/> </p