export const metadata = {
  title: "Privacy Policy - smartDMV",
  description:
    "Learn how smartDMV collects, uses, and protects your personal information.",
};

export default function PrivacyPolicy() {
  return (
    <main className="legal-page">
      <header className="legal-hero">
        <p className="legal-eyebrow">Legal</p>
        <h1 className="legal-title">smartDMV Privacy Policy</h1>
        <p className="legal-updated">Last Updated: May 8, 2026</p>
      </header>

      <article className="legal-article">
        <section className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            smartDMV (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our,&rdquo; or
            &ldquo;Company&rdquo;) is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our web application.
          </p>
          <p>
            Please read this Privacy Policy carefully. If you do not agree with
            our policies and practices, please do not use our service.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Information We Collect</h2>

          <h3>2.1 Information You Provide Directly</h3>
          <p>
            We collect the following personal information when you use
            smartDMV:
          </p>
          <ul>
            <li>
              <strong>Name</strong> — Your full name as provided during
              verification.
            </li>
            <li>
              <strong>Address</strong> — Your residential address for proof of
              residency verification.
            </li>
            <li>
              <strong>Document Uploads</strong> — Scans or photos of documents
              including:
              <ul>
                <li>Bank statements</li>
                <li>Lease agreements</li>
                <li>Utility bills</li>
                <li>Other proof of residency documents</li>
              </ul>
            </li>
          </ul>

          <h3>2.2 Automatic Information</h3>
          <p>We may collect technical information including:</p>
          <ul>
            <li>IP address</li>
            <li>Browser type and version</li>
            <li>Operating system</li>
            <li>Pages visited and time spent on site</li>
            <li>Device information</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Verify proof of residency for DMV applications</li>
            <li>Process your verification requests</li>
            <li>Communicate with you about your application status</li>
            <li>Improve our service quality and user experience</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>
            We do <strong>not</strong> sell, trade, or rent your personal
            information to third parties.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Data Retention and Deletion</h2>

          <h3>4.1 Automatic Deletion</h3>
          <p>
            All personal information, including uploaded documents, is{" "}
            <strong>automatically deleted after 60 days</strong> from the date
            of submission.
          </p>

          <h3>4.2 User-Initiated Deletion</h3>
          <p>
            You may request deletion of your data at any time by contacting us
            at <a href="mailto:privacy@smartdmv.com">privacy@smartdmv.com</a>.
            We will process deletion requests within 7 business days.
          </p>

          <h3>4.3 Legal Holds</h3>
          <p>
            In rare cases, we may retain information longer if required by law
            or for legal proceedings. We will notify you of any such retention.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Security of Your Information</h2>
          <p>
            We implement industry-standard security measures to protect your
            personal information:
          </p>
          <ul>
            <li>
              <strong>Encrypted Transmission</strong> — All data transmitted to
              our servers is encrypted using SSL/TLS technology.
            </li>
            <li>
              <strong>Secure Backend</strong> — Data is stored securely on
              Convex, our backend service provider.
            </li>
            <li>
              <strong>Access Controls</strong> — Only authorized personnel have
              access to your information.
            </li>
            <li>
              <strong>Regular Security Audits</strong> — We regularly assess
              our security practices.
            </li>
          </ul>
          <p>
            However, no method of transmission over the Internet is 100%
            secure. While we strive to protect your information, we cannot
            guarantee absolute security.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Third-Party Service Providers</h2>

          <h3>6.1 Convex Backend</h3>
          <p>
            smartDMV uses Convex as our backend service provider for data
            storage and application functionality. Convex handles:
          </p>
          <ul>
            <li>Database storage of your information</li>
            <li>Application infrastructure</li>
            <li>Data processing</li>
          </ul>
          <p>
            Convex maintains its own privacy policy and security standards.
            Your data is subject to both this Privacy Policy and Convex&apos;s
            terms of service.
          </p>
          <p>
            <strong>Convex Privacy:</strong>{" "}
            <a
              href="https://www.convex.dev/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.convex.dev/privacy
            </a>
          </p>

          <h3>6.2 No Other Third Parties</h3>
          <p>
            We do not use Google Analytics, advertising services, or other
            third-party tracking services. Your data is not shared with
            external analytics or marketing providers.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Your Rights and Choices</h2>

          <h3>7.1 Access Your Information</h3>
          <p>
            You have the right to request access to the personal information we
            hold about you. Submit requests to{" "}
            <a href="mailto:privacy@smartdmv.com">privacy@smartdmv.com</a>.
          </p>

          <h3>7.2 Correct Your Information</h3>
          <p>
            If your information is inaccurate, you may request correction by
            contacting us.
          </p>

          <h3>7.3 Delete Your Information</h3>
          <p>
            You may request deletion of your data at any time. Upon request, we
            will delete your information within 7 business days (automatic
            deletion occurs after 60 days regardless).
          </p>

          <h3>7.4 Opt-Out of Communications</h3>
          <p>
            If you receive marketing communications from us, you may opt-out by
            following the unsubscribe instructions in those messages.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Children&apos;s Privacy</h2>
          <p>
            smartDMV is not intended for individuals under 18 years old. We do
            not knowingly collect personal information from children. If we
            become aware that a child has provided us with personal
            information, we will delete such information promptly.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. CCPA and Privacy Rights</h2>
          <p>
            If you are a California resident, you have additional rights under
            the California Consumer Privacy Act (CCPA):
          </p>
          <ul>
            <li>Right to know what personal data is collected</li>
            <li>Right to delete personal data (subject to exceptions)</li>
            <li>Right to opt-out of data sales (we do not sell data)</li>
            <li>Right to non-discrimination for exercising your rights</li>
          </ul>
          <p>
            To exercise these rights, contact us at{" "}
            <a href="mailto:privacy@smartdmv.com">privacy@smartdmv.com</a>.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy periodically to reflect changes
            in our practices, technology, legal requirements, or other factors.
            We will notify you of any material changes by updating the
            &ldquo;Last Updated&rdquo; date at the top of this policy.
          </p>
          <p>
            Your continued use of smartDMV after any modifications constitutes
            your acceptance of the updated Privacy Policy.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, our privacy
            practices, or your personal information, please contact us:
          </p>
          <p>
            <strong>Email:</strong>{" "}
            <a href="mailto:support@smartdmv.com">support@smartdmv.com</a>
            <br />
            <strong>Website:</strong> smartdmv.com
          </p>
          <p>We will respond to your inquiries within 7 business days.</p>
        </section>

        <section className="legal-section">
          <h2>12. Compliance</h2>
          <p>
            smartDMV is committed to complying with applicable privacy laws
            including:
          </p>
          <ul>
            <li>California Consumer Privacy Act (CCPA)</li>
            <li>General Data Protection Regulation (GDPR) principles</li>
            <li>State privacy laws</li>
          </ul>
        </section>

        <footer className="legal-footer">
          <p>&copy; 2026 smartDMV. All rights reserved.</p>
        </footer>
      </article>
    </main>
  );
}
