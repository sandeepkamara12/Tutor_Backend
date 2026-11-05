// All emails go out through the Resend HTTPS API (port 443).
// Render's free plan blocks SMTP (ports 25 / 465 / 587), so Gmail SMTP / Nodemailer cannot work there.
//
// Needed on the server (Render > Environment):
//   RESEND_API_KEY   the key from resend.com
//   MAIL_FROM        "Russian In Hindi <hello@your-verified-domain.com>"  (the domain must be verified in Resend)
//   OWNER_EMAIL      where the enquiry notifications should arrive (your own address)

// Generic sender, used by the newsletter, the enquiry form and the auto-reply
export async function sendMail({ to, subject, html, text, headers, replyTo }) {
  const { RESEND_API_KEY, MAIL_FROM } = process.env;
  if (!RESEND_API_KEY || !MAIL_FROM) {
    throw new Error('Email is not configured: RESEND_API_KEY and MAIL_FROM are required.');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: MAIL_FROM, to, subject, html, text, headers, reply_to: replyTo }),
    signal: AbortSignal.timeout(15000), // never hang the request
  });

  if (!res.ok) throw new Error(`Email API error ${res.status}: ${await res.text()}`);
}

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const row = (label, value) =>
  value ? `<tr><td style="padding:4px 12px 4px 0;color:#555"><b>${label}</b></td><td>${escapeHtml(value)}</td></tr>` : '';

// email to YOU: a new message arrived
export async function sendOwnerNotification(contact) {
  const owner = process.env.OWNER_EMAIL;
  if (!owner) throw new Error('OWNER_EMAIL is missing.');

  await sendMail({
    to: owner,
    replyTo: `${String(contact.name).replace(/[<>"\r\n]/g, '')} <${contact.email}>`, // press "Reply" and you answer the student
    subject: `New message: ${contact.interest || contact.name}`,
    html: `
      <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background-color:#1b356b;"
  >
    <tr>
      <td
        align="center"
        style="padding:40px 16px;"
      >

        <table
          role="presentation"
          width="600"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="width:100%; max-width:600px; background-color:#fcfbfb; border-radius:4px;"
        >

          <tr>
            <td
              align="center"
              style="padding:36px 48px 18px 44px;"
            >
              <span style="display: block; font-size:32px; font-weight:bold; color:#f45d48; line-height:1;">
                <img
                  src="https://res.cloudinary.com/dsneopn5j/image/upload/v1792754160/logos_kkhjc9.png"
                  alt="logo"
                  style="max-width: 60px; margin: auto;"
                />
              </span>
              <span
                style="display: block; color: #1b356b; font-weight: bold; text-transform: uppercase; font-size: 14px;"
              >Russian In Hindi</span>
            </td>
          </tr>

          <tr>
            <td style="padding:0 44px;">
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="background-color:#ffffff; border:1px solid #e6e6e6; border-collapse: collapse; table-layout:fixed;"
              >
                <tr>
                  <td
                    colspan="2"
                    style="padding:9px 24px 9px 24px;"
                  >
                    <h1 style="margin:0; font-size:16px; font-weight:bold; color:#ee2010;">Hello Admin, New enquiry received!</h1>
                  </td>
                </tr>
                <tr>
                  <td
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1; color:#1b356b; font-weight: bold; width:25%;"
                  >Name</td>
                  <td
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1; color:#4a4a4a;"
                  >${escapeHtml(contact.name)}</td>
                </tr>
                <tr>
                  <td
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1; color:#1b356b; font-weight: bold; width:25%;"
                  >Email</td>
                  <td
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1; color:#4a4a4a;"
                  >${escapeHtml(contact.email)}</td>
                </tr>
                <tr>
                  <td
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1; color:#1b356b; font-weight: bold; width:25%;"
                  >Phone</td>
                  <td
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1; color:#4a4a4a;"
                  >${escapeHtml(contact.phone)}</td>
                </tr>
                <tr>
                  <td
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1; color:#1b356b; font-weight: bold; width:25%;"
                  >Interested In</td>
                  <td
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1; color:#4a4a4a;"
                  >${escapeHtml(contact.interest)}</td>
                </tr>
                <tr>
                  <td
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1; color:#1b356b; font-weight: bold; width:25%;"
                  >Level</td>
                  <td
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1; color:#4a4a4a;"
                  >${escapeHtml(contact.level)}</td>
                </tr>
                <tr>
                  <td
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1; color:#1b356b; font-weight: bold; width:25%;"
                  >Newsletter</td>
                  <td
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1; color:#4a4a4a;"
                  >${contact.newsletter ? 'Yes' : 'No'}</td>
                </tr>
                <tr>
                  <td
                    colspan="2"
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1; color:#1b356b; font-weight: bold; width:25%;"
                  >Message</td>
                </tr>
                <tr>
                  <td
                    colspan="2"
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1.5; color:#4a4a4a;"
                  >${escapeHtml(contact.message)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td
              align="center"
              style="padding:24px 20px 40px 20px; "
            >
              <div style="display: block; font-size:32px; font-weight:bold; color:#f45d48; line-height:1;">
                <img
                  src="https://res.cloudinary.com/dsneopn5j/image/upload/v1792754160/logos_kkhjc9.png"
                  alt="logo"
                  style="max-width: 60px; margin: auto;"
                />
              </div>
              <div style="font-size:15px; color:#53525d; padding-top:10px; padding-bottom:10px;">123 Tech Avenue, San
                Francisco, USA</div>
              <div style="padding-bottom:20px;">
                <a
                  href="https://tutor-taupe.vercel.app/"
                  target="_blank"
                  style="font-size:15px; font-weight:bold; color:#1b356b; text-decoration:underline;"
                >Russian In Hindi</a>
              </div>
              <div style="font-size:14px; line-height:1;">
                <a
                  href="#"
                  style="color:#8a8a93; text-decoration:none; padding:0 3px; font-weight:bold; display: inline-block; width:16px; height:16px;"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    width="100%"
                    height="100%"
                    style="fill:#8a8a93;"
                  >
                    <path
                      d="M576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 440 146.7 540.8 258.2 568.5L258.2 398.2L205.4 398.2L205.4 320L258.2 320L258.2 286.3C258.2 199.2 297.6 158.8 383.2 158.8C399.4 158.8 427.4 162 438.9 165.2L438.9 236C432.9 235.4 422.4 235 409.3 235C367.3 235 351.1 250.9 351.1 292.2L351.1 320L434.7 320L420.3 398.2L351 398.2L351 574.1C477.8 558.8 576 450.9 576 320z"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  style="color:#8a8a93; text-decoration:none; padding:0 3px; font-weight:bold; display: inline-block; width:16px; height:16px;"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    width="100%"
                    height="100%"
                    style="fill:#8a8a93;"
                  >
                    <path
                      d="M523.4 215.7C523.7 220.2 523.7 224.8 523.7 229.3C523.7 368 418.1 527.9 225.1 527.9C165.6 527.9 110.4 510.7 64 480.8C72.4 481.8 80.6 482.1 89.3 482.1C138.4 482.1 183.5 465.5 219.6 437.3C173.5 436.3 134.8 406.1 121.5 364.5C128 365.5 134.5 366.1 141.3 366.1C150.7 366.1 160.1 364.8 168.9 362.5C120.8 352.8 84.8 310.5 84.8 259.5L84.8 258.2C98.8 266 115 270.9 132.2 271.5C103.9 252.7 85.4 220.5 85.4 184.1C85.4 164.6 90.6 146.7 99.7 131.1C151.4 194.8 229 236.4 316.1 240.9C314.5 233.1 313.5 225 313.5 216.9C313.5 159.1 360.3 112 418.4 112C448.6 112 475.9 124.7 495.1 145.1C518.8 140.6 541.6 131.8 561.7 119.8C553.9 144.2 537.3 164.6 515.6 177.6C536.7 175.3 557.2 169.5 576 161.4C561.7 182.2 543.8 200.7 523.4 215.7z"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  style="color:#8a8a93; text-decoration:none; padding:0 3px; font-weight:bold; display: inline-block; width:16px; height:16px;"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    width="100%"
                    height="100%"
                    style="fill:#8a8a93;"
                  >
                    <path
                      d="M581.7 188.1C575.5 164.4 556.9 145.8 533.4 139.5C490.9 128 320.1 128 320.1 128C320.1 128 149.3 128 106.7 139.5C83.2 145.8 64.7 164.4 58.4 188.1C47 231 47 320.4 47 320.4C47 320.4 47 409.8 58.4 452.7C64.7 476.3 83.2 494.2 106.7 500.5C149.3 512 320.1 512 320.1 512C320.1 512 490.9 512 533.5 500.5C557 494.2 575.5 476.3 581.8 452.7C593.2 409.8 593.2 320.4 593.2 320.4C593.2 320.4 593.2 231 581.8 188.1zM264.2 401.6L264.2 239.2L406.9 320.4L264.2 401.6z"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  style="color:#8a8a93; text-decoration:none; padding:0 3px; font-weight:bold; display: inline-block; width:16px; height:16px;"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    width="100%"
                    height="100%"
                    style="fill:#8a8a93;"
                  >
                    <path
                      d="M320.3 205C256.8 204.8 205.2 256.2 205 319.7C204.8 383.2 256.2 434.8 319.7 435C383.2 435.2 434.8 383.8 435 320.3C435.2 256.8 383.8 205.2 320.3 205zM319.7 245.4C360.9 245.2 394.4 278.5 394.6 319.7C394.8 360.9 361.5 394.4 320.3 394.6C279.1 394.8 245.6 361.5 245.4 320.3C245.2 279.1 278.5 245.6 319.7 245.4zM413.1 200.3C413.1 185.5 425.1 173.5 439.9 173.5C454.7 173.5 466.7 185.5 466.7 200.3C466.7 215.1 454.7 227.1 439.9 227.1C425.1 227.1 413.1 215.1 413.1 200.3zM542.8 227.5C541.1 191.6 532.9 159.8 506.6 133.6C480.4 107.4 448.6 99.2 412.7 97.4C375.7 95.3 264.8 95.3 227.8 97.4C192 99.1 160.2 107.3 133.9 133.5C107.6 159.7 99.5 191.5 97.7 227.4C95.6 264.4 95.6 375.3 97.7 412.3C99.4 448.2 107.6 480 133.9 506.2C160.2 532.4 191.9 540.6 227.8 542.4C264.8 544.5 375.7 544.5 412.7 542.4C448.6 540.7 480.4 532.5 506.6 506.2C532.8 480 541 448.2 542.8 412.3C544.9 375.3 544.9 264.5 542.8 227.5zM495 452C487.2 471.6 472.1 486.7 452.4 494.6C422.9 506.3 352.9 503.6 320.3 503.6C287.7 503.6 217.6 506.2 188.2 494.6C168.6 486.8 153.5 471.7 145.6 452C133.9 422.5 136.6 352.5 136.6 319.9C136.6 287.3 134 217.2 145.6 187.8C153.4 168.2 168.5 153.1 188.2 145.2C217.7 133.5 287.7 136.2 320.3 136.2C352.9 136.2 423 133.6 452.4 145.2C472 153 487.1 168.1 495 187.8C506.7 217.3 504 287.3 504 319.9C504 352.5 506.7 422.6 495 452z"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  style="color:#8a8a93; text-decoration:none; padding:0 3px; font-weight:bold; display: inline-block; width:16px; height:16px;"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    width="100%"
                    height="100%"
                    style="fill:#8a8a93;"
                  >
                    <path
                      d="M332 70.5C229.4 70.5 128 138.9 128 249.6C128 320 167.6 360 191.6 360C201.5 360 207.2 332.4 207.2 324.6C207.2 315.3 183.5 295.5 183.5 256.8C183.5 176.4 244.7 119.4 323.9 119.4C392 119.4 442.4 158.1 442.4 229.2C442.4 282.3 421.1 381.9 352.1 381.9C327.2 381.9 305.9 363.9 305.9 338.1C305.9 300.3 332.3 263.7 332.3 224.7C332.3 158.5 238.4 170.5 238.4 250.5C238.4 267.3 240.5 285.9 248 301.2C234.2 360.6 206 449.1 206 510.3C206 529.2 208.7 547.8 210.5 566.7C213.9 570.5 212.2 570.1 217.4 568.2C267.8 499.2 266 485.7 288.8 395.4C301.1 418.8 332.9 431.4 358.1 431.4C464.3 431.4 512 327.9 512 234.6C512 135.3 426.2 70.5 332 70.5z"
                    />
                  </svg>
                </a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>`,
  });
}

// email to the STUDENT: we got your message
export async function sendAutoReply(contact) {
  await sendMail({
    to: contact.email,
    subject: 'Thanks for your message - Russian in Hindi',
    html: `
      <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background-color:#1b356b;"
  >
    <tr>
      <td
        align="center"
        style="padding:40px 16px;"
      >
        <table
          role="presentation"
          width="600"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="width:100%; max-width:600px; background-color:#fcfbfb; border-radius:4px;"
        >

          <tr>
            <td
              align="center"
              style="padding:36px 48px 18px 44px;"
            >
              <span style="display: block; font-size:32px; font-weight:bold; color:#f45d48; line-height:1;">
                <img
                  src="https://res.cloudinary.com/dsneopn5j/image/upload/v1792754160/logos_kkhjc9.png"
                  alt="logo"
                  style="max-width: 60px; margin: auto;"
                />
              </span>
              <span
                style="display: block; color: #1b356b; font-weight: bold; text-transform: uppercase; font-size: 14px;"
              >Russian In Hindi</span>
            </td>
          </tr>

          <tr>
            <td style="padding:0 44px;">
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="background-color:#ffffff; border:1px solid #e6e6e6; border-collapse: collapse; table-layout:fixed;"
              >
                <tr>
                  <td
                    colspan="2"
                    style="border:1px solid #e6e6e6; padding:9px 24px 9px 24px; font-size:14px; line-height:1.5; color:#53525d; width:25%;"
                  >
                    <h1 style="margin:0; font-size:16px; font-weight:bold; color:#1b356b;">Hi, ${escapeHtml(contact.name)}</h1>
                    <p style="font-weight: bold; color:#1b356b;">Thank you for writing to me. I have received your
                      message and I will reply within 1-2 working days.</p>
                    <p>${escapeHtml(contact.message)}</p>
                    <p>Dhanyavaad<br />
                      Russian in Hindi</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <tr>
            <td
              align="center"
              style="padding:24px 20px 40px 20px; "
            >
              <div style="display: block; font-size:32px; font-weight:bold; color:#f45d48; line-height:1;">
                <img
                  src="https://res.cloudinary.com/dsneopn5j/image/upload/v1792754160/logos_kkhjc9.png"
                  alt="logo"
                  style="max-width: 60px; margin: auto;"
                />
              </div>
              <div style="font-size:15px; color:#53525d; padding-top:10px; padding-bottom:10px;">123 Tech Avenue, San
                Francisco, USA</div>
              <div style="padding-bottom:20px;">
                <a
                  href="https://tutor-taupe.vercel.app/"
                  target="_blank"
                  style="font-size:15px; font-weight:bold; color:#1b356b; text-decoration:underline;"
                >Russian In Hindi</a>
              </div>
              <div style="font-size:14px; line-height:1;">
                <a
                  href="#"
                  style="color:#8a8a93; text-decoration:none; padding:0 3px; font-weight:bold; display: inline-block; width:16px; height:16px;"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    width="100%"
                    height="100%"
                    style="fill:#8a8a93;"
                  >
                    <path
                      d="M576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 440 146.7 540.8 258.2 568.5L258.2 398.2L205.4 398.2L205.4 320L258.2 320L258.2 286.3C258.2 199.2 297.6 158.8 383.2 158.8C399.4 158.8 427.4 162 438.9 165.2L438.9 236C432.9 235.4 422.4 235 409.3 235C367.3 235 351.1 250.9 351.1 292.2L351.1 320L434.7 320L420.3 398.2L351 398.2L351 574.1C477.8 558.8 576 450.9 576 320z"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  style="color:#8a8a93; text-decoration:none; padding:0 3px; font-weight:bold; display: inline-block; width:16px; height:16px;"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    width="100%"
                    height="100%"
                    style="fill:#8a8a93;"
                  >
                    <path
                      d="M523.4 215.7C523.7 220.2 523.7 224.8 523.7 229.3C523.7 368 418.1 527.9 225.1 527.9C165.6 527.9 110.4 510.7 64 480.8C72.4 481.8 80.6 482.1 89.3 482.1C138.4 482.1 183.5 465.5 219.6 437.3C173.5 436.3 134.8 406.1 121.5 364.5C128 365.5 134.5 366.1 141.3 366.1C150.7 366.1 160.1 364.8 168.9 362.5C120.8 352.8 84.8 310.5 84.8 259.5L84.8 258.2C98.8 266 115 270.9 132.2 271.5C103.9 252.7 85.4 220.5 85.4 184.1C85.4 164.6 90.6 146.7 99.7 131.1C151.4 194.8 229 236.4 316.1 240.9C314.5 233.1 313.5 225 313.5 216.9C313.5 159.1 360.3 112 418.4 112C448.6 112 475.9 124.7 495.1 145.1C518.8 140.6 541.6 131.8 561.7 119.8C553.9 144.2 537.3 164.6 515.6 177.6C536.7 175.3 557.2 169.5 576 161.4C561.7 182.2 543.8 200.7 523.4 215.7z"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  style="color:#8a8a93; text-decoration:none; padding:0 3px; font-weight:bold; display: inline-block; width:16px; height:16px;"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    width="100%"
                    height="100%"
                    style="fill:#8a8a93;"
                  >
                    <path
                      d="M581.7 188.1C575.5 164.4 556.9 145.8 533.4 139.5C490.9 128 320.1 128 320.1 128C320.1 128 149.3 128 106.7 139.5C83.2 145.8 64.7 164.4 58.4 188.1C47 231 47 320.4 47 320.4C47 320.4 47 409.8 58.4 452.7C64.7 476.3 83.2 494.2 106.7 500.5C149.3 512 320.1 512 320.1 512C320.1 512 490.9 512 533.5 500.5C557 494.2 575.5 476.3 581.8 452.7C593.2 409.8 593.2 320.4 593.2 320.4C593.2 320.4 593.2 231 581.8 188.1zM264.2 401.6L264.2 239.2L406.9 320.4L264.2 401.6z"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  style="color:#8a8a93; text-decoration:none; padding:0 3px; font-weight:bold; display: inline-block; width:16px; height:16px;"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    width="100%"
                    height="100%"
                    style="fill:#8a8a93;"
                  >
                    <path
                      d="M320.3 205C256.8 204.8 205.2 256.2 205 319.7C204.8 383.2 256.2 434.8 319.7 435C383.2 435.2 434.8 383.8 435 320.3C435.2 256.8 383.8 205.2 320.3 205zM319.7 245.4C360.9 245.2 394.4 278.5 394.6 319.7C394.8 360.9 361.5 394.4 320.3 394.6C279.1 394.8 245.6 361.5 245.4 320.3C245.2 279.1 278.5 245.6 319.7 245.4zM413.1 200.3C413.1 185.5 425.1 173.5 439.9 173.5C454.7 173.5 466.7 185.5 466.7 200.3C466.7 215.1 454.7 227.1 439.9 227.1C425.1 227.1 413.1 215.1 413.1 200.3zM542.8 227.5C541.1 191.6 532.9 159.8 506.6 133.6C480.4 107.4 448.6 99.2 412.7 97.4C375.7 95.3 264.8 95.3 227.8 97.4C192 99.1 160.2 107.3 133.9 133.5C107.6 159.7 99.5 191.5 97.7 227.4C95.6 264.4 95.6 375.3 97.7 412.3C99.4 448.2 107.6 480 133.9 506.2C160.2 532.4 191.9 540.6 227.8 542.4C264.8 544.5 375.7 544.5 412.7 542.4C448.6 540.7 480.4 532.5 506.6 506.2C532.8 480 541 448.2 542.8 412.3C544.9 375.3 544.9 264.5 542.8 227.5zM495 452C487.2 471.6 472.1 486.7 452.4 494.6C422.9 506.3 352.9 503.6 320.3 503.6C287.7 503.6 217.6 506.2 188.2 494.6C168.6 486.8 153.5 471.7 145.6 452C133.9 422.5 136.6 352.5 136.6 319.9C136.6 287.3 134 217.2 145.6 187.8C153.4 168.2 168.5 153.1 188.2 145.2C217.7 133.5 287.7 136.2 320.3 136.2C352.9 136.2 423 133.6 452.4 145.2C472 153 487.1 168.1 495 187.8C506.7 217.3 504 287.3 504 319.9C504 352.5 506.7 422.6 495 452z"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  style="color:#8a8a93; text-decoration:none; padding:0 3px; font-weight:bold; display: inline-block; width:16px; height:16px;"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    width="100%"
                    height="100%"
                    style="fill:#8a8a93;"
                  >
                    <path
                      d="M332 70.5C229.4 70.5 128 138.9 128 249.6C128 320 167.6 360 191.6 360C201.5 360 207.2 332.4 207.2 324.6C207.2 315.3 183.5 295.5 183.5 256.8C183.5 176.4 244.7 119.4 323.9 119.4C392 119.4 442.4 158.1 442.4 229.2C442.4 282.3 421.1 381.9 352.1 381.9C327.2 381.9 305.9 363.9 305.9 338.1C305.9 300.3 332.3 263.7 332.3 224.7C332.3 158.5 238.4 170.5 238.4 250.5C238.4 267.3 240.5 285.9 248 301.2C234.2 360.6 206 449.1 206 510.3C206 529.2 208.7 547.8 210.5 566.7C213.9 570.5 212.2 570.1 217.4 568.2C267.8 499.2 266 485.7 288.8 395.4C301.1 418.8 332.9 431.4 358.1 431.4C464.3 431.4 512 327.9 512 234.6C512 135.3 426.2 70.5 332 70.5z"
                    />
                  </svg>
                </a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>`,
  });
}
