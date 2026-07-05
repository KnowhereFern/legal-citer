import type { Metadata } from "next";
import {
  LegalBulletList,
  LegalCallout,
  LegalH3,
  LegalLink,
  LegalList,
  LegalP,
  LegalPage,
  LegalSection,
} from "@/components/legal-page";
import { BRAND } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Privacy Policy — ${BRAND.company}`,
  description: `How ${BRAND.company} collects, uses, and protects information.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      currentPath="/privacy"
      title="Privacy Policy"
      subtitle={`How ${BRAND.company} collects, uses, discloses, protects, and retains information.`}
      intro={
        <>
          This Privacy Policy explains how {LEGAL.entityName} (“{BRAND.company},
          ” “we,” “us,” or “our”) collects, uses, discloses, protects, and
          retains information when you use {BRAND.company}, {BRAND.product}, our
          websites, applications, reports, verification records, APIs, and
          related services (collectively, the “Service”).
          <br />
          <br />
          This Privacy Policy is designed for a pre-filing verification service
          that may process legal documents and sensitive information.
        </>
      }
    >
      <LegalSection id="scope" title="1. Scope">
        <LegalP>
          This Privacy Policy applies to information we process through the
          Service. It does not apply to third-party websites, legal research
          providers, court systems, payment processors, authentication
          providers, or other third parties that have their own privacy
          policies.
        </LegalP>
        <LegalP>
          If you use the Service through a law firm, company, school, clinic,
          legal aid organization, or other workspace, that organization may
          control certain data and settings. You should also review that
          organization’s policies.
        </LegalP>
      </LegalSection>

      <LegalSection id="information-we-collect" title="2. Information We Collect">
        <LegalP>We may collect the following categories of information.</LegalP>

        <LegalH3>Account Information</LegalH3>
        <LegalP>
          Name, email address, password-related authentication data, workspace
          membership, organization name, role, profile settings, login
          metadata, and account preferences.
        </LegalP>

        <LegalH3>Document and Filing Information</LegalH3>
        <LegalP>
          Documents you upload; extracted text; citations; quotes; docket
          references; record citations; case metadata; filing type; court or
          jurisdiction selections; AI-use disclosure selections; prompts;
          reviewer notes; exception decisions; generated reports; verification
          records; document hashes; timestamps; run IDs; audit metadata; and
          related processing information.
        </LegalP>

        <LegalH3>Payment and Billing Information</LegalH3>
        <LegalP>
          Plan type, purchase history, invoice details, billing address, tax
          information, subscription status, and payment processor identifiers.
          We do not intentionally store full payment card numbers on our own
          servers.
        </LegalP>

        <LegalH3>Usage and Device Information</LegalH3>
        <LegalP>
          IP address, browser type, device type, operating system, pages
          viewed, clicks, upload status, processing events, log data, errors,
          feature usage, referral source, approximate location derived from IP
          address, and cookies or similar technologies.
        </LegalP>

        <LegalH3>Communications</LegalH3>
        <LegalP>
          Messages you send us, support requests, feedback, survey responses,
          emails, and other communications.
        </LegalP>
      </LegalSection>

      <LegalSection id="how-we-use-information" title="3. How We Use Information">
        <LegalP>We may use information to:</LegalP>
        <LegalList
          items={[
            "provide, operate, maintain, and improve the Service;",
            "process uploads and generate verification outputs;",
            "extract and verify citations, quotes, metadata, record references, and AI-use disclosure support;",
            "create reports, public verification summaries, private exception reports, hashes, timestamps, and audit records;",
            "authenticate users and manage workspace access;",
            "process payments and prevent fraud;",
            "provide support and respond to requests;",
            "monitor security, prevent abuse, debug errors, and protect the Service;",
            "analyze usage and improve user experience;",
            "comply with law, court orders, subpoenas, legal process, and regulatory obligations;",
            "enforce our Terms and protect rights, safety, and property;",
            "send service notices, security alerts, billing notices, product updates, and marketing communications where permitted.",
          ]}
        />
      </LegalSection>

      <LegalSection id="ai-processing-and-model-training" title="4. AI Processing and Model Training">
        <LegalP>
          The Service may use deterministic scripts, OCR, citation parsers,
          source resolvers, machine learning, and AI systems to process
          documents and generate outputs.
        </LegalP>
        <LegalP>
          Unless you expressly opt in, we do not use uploaded legal documents
          or extracted document text to train general-purpose AI models. We may
          use de-identified, aggregated, or operational metadata to improve
          reliability, security, parsing, reporting, source routing, and
          product performance.
        </LegalP>
        <LegalP>
          If we offer optional improvement programs, beta programs, or
          model-training opt-ins, we will explain the scope and obtain consent
          where required.
        </LegalP>
      </LegalSection>

      <LegalSection id="retention" title="5. Retention">
        <LegalP>
          Retention may vary by plan, workspace settings, document type, user
          choice, legal obligations, security needs, and technical constraints.
          Our intended default retention model is:
        </LegalP>
        <LegalList
          items={[
            "raw uploaded files: deleted after processing or within a short period unless retention is enabled;",
            "extracted full text and temporary files: deleted after processing or within a short period unless retention is enabled;",
            "reports and verification records: retained for the period shown in the product or workspace settings;",
            "audit metadata, hashes, billing records, and security logs: retained as needed for legal, security, accounting, compliance, fraud-prevention, and dispute-resolution purposes;",
            "backups and logs: deleted or overwritten on normal backup and log rotation schedules.",
          ]}
        />
        <LegalP>
          Deletion may not be immediate in backups, logs, caches, soft-delete
          systems, third-party processors, or legally required records. We will
          not promise instant deletion unless the product setting expressly
          supports it and we can technically honor it.
        </LegalP>
      </LegalSection>

      <LegalSection id="how-we-share-information" title="6. How We Share Information">
        <LegalP>
          We may share information with the following categories of recipients.
        </LegalP>

        <LegalH3>Service Providers</LegalH3>
        <LegalP>
          Cloud hosting providers, storage providers, authentication providers,
          payment processors, email providers, analytics providers, logging and
          security vendors, AI providers, OCR providers, legal data providers,
          court-data connectors, customer support tools, and other vendors that
          help us operate the Service.
        </LegalP>

        <LegalH3>Workspace Administrators and Authorized Users</LegalH3>
        <LegalP>
          If you use a workspace, reports, documents, audit logs, usage data,
          and account information may be visible to workspace owners,
          administrators, or other authorized users according to workspace
          settings.
        </LegalP>

        <LegalH3>Legal and Safety Purposes</LegalH3>
        <LegalP>
          We may disclose information if we believe disclosure is necessary to
          comply with law, legal process, court orders, subpoenas, governmental
          requests, regulatory requirements, enforce our Terms, protect rights
          and safety, investigate fraud or security incidents, or prevent harm.
        </LegalP>

        <LegalH3>Business Transfers</LegalH3>
        <LegalP>
          If we are involved in a merger, acquisition, financing,
          reorganization, bankruptcy, sale of assets, or similar transaction,
          information may be transferred as part of that transaction.
        </LegalP>

        <LegalH3>With Your Direction or Consent</LegalH3>
        <LegalP>
          We may share information when you ask us to do so, such as when you
          publish a public verification page, invite users to a workspace, send
          a report link, connect an integration, or authorize a third-party
          workflow.
        </LegalP>
      </LegalSection>

      <LegalSection id="public-verification-pages" title="7. Public Verification Pages">
        <LegalP>
          The Service may let users create public or shareable verification
          pages. These pages may display limited information such as
          verification ID, document hash, run timestamp, status, scope of
          checks, and summary counts.
        </LegalP>
        <LegalP>
          Public verification pages should not display raw filing text, client
          secrets, privileged material, or sensitive excerpts unless you choose
          settings that allow such disclosure. You are responsible for deciding
          whether to publish or share any verification page.
        </LegalP>
      </LegalSection>

      <LegalSection id="cookies-and-analytics" title="8. Cookies and Analytics">
        <LegalP>
          We may use cookies, pixels, local storage, and similar technologies
          to operate the Service, keep users signed in, remember preferences,
          prevent fraud, measure usage, and improve the product.
        </LegalP>
        <LegalP>
          You may control cookies through your browser settings. Some features
          may not work if cookies are disabled.
        </LegalP>
      </LegalSection>

      <LegalSection id="marketing-communications" title="9. Marketing Communications">
        <LegalP>
          We may send product updates, newsletters, promotions, and event
          notices where permitted. You may opt out of marketing emails by using
          the unsubscribe link or contacting us. We may still send
          transactional or service-related messages.
        </LegalP>
      </LegalSection>

      <LegalSection id="security" title="10. Security">
        <LegalP>
          We use administrative, technical, and organizational safeguards
          designed to protect information, such as access controls, encryption
          in transit, restricted employee access, logging, vendor review, and
          retention limits. No method of transmission or storage is perfectly
          secure, and we cannot guarantee absolute security.
        </LegalP>
        <LegalP>
          You are responsible for protecting your account credentials, using
          strong authentication, controlling workspace access, and ensuring that
          only authorized users can view documents and reports.
        </LegalP>
      </LegalSection>

      <LegalSection id="your-privacy-choices" title="11. Your Privacy Choices">
        <LegalP>
          Depending on your location and the laws that apply, you may have
          rights to request access, correction, deletion, portability,
          restriction, objection, or opt-out of certain processing. You may
          also have the right to appeal a denied request.
        </LegalP>
        <LegalCallout>
          To make a privacy request, contact us at{" "}
          <LegalLink href={`mailto:${LEGAL.privacyEmail}`}>
            {LEGAL.privacyEmail}
          </LegalLink>
          . We may need to verify your identity and authority before
          responding. We may deny or limit requests where permitted by law,
          including where retention is required for security, legal,
          accounting, dispute-resolution, fraud-prevention, or compliance
          reasons.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="us-state-privacy-notice" title="12. U.S. State Privacy Notice">
        <LegalP>
          Some U.S. state privacy laws require additional disclosures.
          Depending on your location, the categories of personal information we
          collect may include identifiers, commercial information, internet or
          network activity, approximate geolocation, professional or
          employment-related information, sensitive information contained in
          documents, and inferences from usage data.
        </LegalP>
        <LegalP>
          We use these categories for the purposes described in this Privacy
          Policy. We do not sell uploaded legal documents. We do not use
          uploaded legal documents for cross-context behavioral advertising. If
          our practices change, we will update this Privacy Policy and provide
          legally required choices.
        </LegalP>
      </LegalSection>

      <LegalSection id="sensitive-information" title="13. Sensitive Information">
        <LegalP>
          Legal filings may include sensitive personal information, confidential
          case information, financial information, health information,
          government identifiers, criminal-history information, family
          information, immigration information, trade secrets, or privileged
          material.
        </LegalP>
        <LegalBulletList
          items={[
            "Upload only what is needed for the verification run.",
            "Do not upload documents you are not authorized to process.",
            "Consider redacting information that is not needed for citation, quote, or filing verification.",
          ]}
        />
      </LegalSection>

      <LegalSection id="children" title="14. Children">
        <LegalP>
          The Service is not intended for children under 18. We do not
          knowingly collect personal information from children under 13. If you
          believe a child provided personal information to us, contact us and we
          will take appropriate steps.
        </LegalP>
      </LegalSection>

      <LegalSection id="international-users" title="15. International Users">
        <LegalP>
          The Service may be operated from the United States and other
          locations. By using the Service, you understand that information may
          be processed in jurisdictions that may have different data protection
          laws than your location.
        </LegalP>
      </LegalSection>

      <LegalSection id="third-party-links-and-integrations" title="16. Third-Party Links and Integrations">
        <LegalP>
          The Service may link to or integrate with third-party websites, court
          systems, legal research tools, payment processors, authentication
          tools, analytics tools, and other services. We are not responsible
          for the privacy practices of third parties. Review their policies
          before using them.
        </LegalP>
      </LegalSection>

      <LegalSection id="changes-to-this-privacy-policy" title="17. Changes to This Privacy Policy">
        <LegalP>
          We may update this Privacy Policy from time to time. The updated
          version will be posted with a new “Last updated” date. If changes are
          material, we may provide additional notice where required.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" title="18. Contact">
        <LegalP>
          Questions or privacy requests may be sent to {LEGAL.entityName} at the
          address and emails below.
        </LegalP>
      </LegalSection>
    </LegalPage>
  );
}
