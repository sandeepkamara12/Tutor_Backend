# Contact backend (Express + MongoDB + Nodemailer)

## 1. MongoDB Atlas (free)
1. Create an account at https://www.mongodb.com/cloud/atlas and create a free **M0** cluster.
2. **Database Access** -> Add database user -> username + password (letters and numbers only keeps the URL simple).
3. **Network Access** -> Add IP address. For testing use "Allow access from anywhere" (0.0.0.0/0); once hosted, use your host's IP.
4. **Database** -> Connect -> Drivers -> copy the connection string. Put your user and password in it and add the database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/russian-in-hindi?retryWrites=true&w=majority`
5. Messages are stored in the `contacts` collection (Atlas -> Browse collections).

## 2. Email (Gmail example)
1. Turn on 2-step verification for the Google account.
2. Google Account -> Security -> App passwords -> create one -> 16 letters, no spaces.
3. `SMTP_USER` = your Gmail, `SMTP_PASS` = the app password.
(You can use Brevo, Resend or Zoho SMTP instead: only the SMTP_* values change.)

## 3. Run
```
cd contact-backend
npm install
cp .env.example .env     # fill in the values
npm run dev
```
Test: `curl http://localhost:5000/api/health`

## 4. React
Copy `ContactForm.jsx` into your project and add `VITE_API_URL=http://localhost:5000` to the React `.env`.
