import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Link,
} from "@react-email/components";

export function MagicLinkEmail({ link }: { link: string }) {
  return (
    <Html>
      <Head />
      <Preview>Your sign-in link</Preview>
      <Body style={{ fontFamily: "Arial, sans-serif" }}>
        <Container>
          <Heading>Sign in to SUGB</Heading>
          <Text>
            Click the link below to sign in. This link will expire soon.
          </Text>
          <Text>
            <Link href={link}>{link}</Link>
          </Text>
          <Text>If you didn’t request this, you can ignore this email.</Text>
        </Container>
      </Body>
    </Html>
  );
}
