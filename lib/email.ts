import nodemailer from "nodemailer";

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });
}

export async function sendWelcomeEmail(email: string, name: string) {
  const transport = createTransport();

  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Welcome to PrepMate AI!",
    text: `Hi ${name},\n\nWelcome to PrepMate AI! Your account is all set up and you're ready to start studying smarter.\n\nPrepMate AI uses artificial intelligence to help you generate study plans, summarise complex topics, and create custom quizzes — all tailored to your courses and exam dates.\n\nHere's what you can do:\n- Generate personalised study plans\n- Summarise difficult topics with AI\n- Create practice quizzes to test your knowledge\n- Track your progress over time\n\nHead over to your dashboard to get started: ${process.env.NEXTAUTH_URL}/chatmate\n\nHappy studying,\nThe PrepMate AI Team`,
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 24px; color: #1a1a2e; margin: 0 0 8px;">Welcome to PrepMate AI!</h1>
      <p style="font-size: 16px; color: #555; margin: 0 0 16px;">Hi <strong>${name}</strong>,</p>
      <p style="font-size: 16px; color: #555; margin: 0 0 16px;">Your account is all set up and you're ready to start studying smarter.</p>
      <p style="font-size: 16px; color: #555; margin: 0 0 16px;">PrepMate AI uses artificial intelligence to help you generate study plans, summarise complex topics, and create custom quizzes — all tailored to your courses and exam dates.</p>
      <div style="background: #f8f9fc; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="font-size: 15px; color: #333; margin: 0 0 12px; font-weight: 600;">Here's what you can do:</p>
        <ul style="font-size: 15px; color: #555; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Generate personalised study plans</li>
          <li>Summarise difficult topics with AI</li>
          <li>Create practice quizzes to test your knowledge</li>
          <li>Track your progress over time</li>
        </ul>
      </div>
      <a href="${process.env.NEXTAUTH_URL}/chatmate" style="display: inline-block; background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 600;">Go to dashboard</a>
      <p style="font-size: 14px; color: #888; margin-top: 24px;">Happy studying,<br>The PrepMate AI Team</p>
    </div>`,
  });
}
