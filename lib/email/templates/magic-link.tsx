export function MagicLinkEmail({ link }: { link: string }) {
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", lineHeight: 1.6 }}>
      <h2>Sign in to SUGB</h2>
      <p>Click the button below to finish signing in.</p>
      <p>
        <a
          href={link}
          style={{
            display: "inline-block",
            padding: "10px 16px",
            borderRadius: 6,
            background: "#111827",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Sign in
        </a>
      </p>
      <p style={{ fontSize: 12, color: "#6b7280" }}>
        Or copy & paste this link: <br />
        <a href={link}>{link}</a>
      </p>
      <hr />
      <p style={{ fontSize: 12, color: "#6b7280" }}>
        If you didn’t request this email, you can safely ignore it.
      </p>
    </div>
  );
}
