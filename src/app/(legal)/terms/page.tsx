import type { Metadata } from "next";
import {
  LegalCallout,
  LegalList,
  LegalP,
  LegalPage,
  LegalSection,
} from "@/components/legal-page";
import { BRAND } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Terms of Service — ${BRAND.company}`,
  description: `The terms that govern use of ${BRAND.company} and ${BRAND.product}.`,
};

export default function TermsPage() {
  return (
    <LegalPage
      currentPath="/terms"
      title="Terms of Service"
      subtitle={`These terms govern your use of ${BRAND.company}, ${BRAND.product}, and related services.`}
      intro={
        <>
          These Terms of Service (the “Terms”) govern access to and use of{" "}
          {BRAND.company}, {BRAND.product}, our websites, applications, reports,
          verification records, APIs, and related services (collectively, the
          “Service”). These Terms are between you and {LEGAL.entityName} (“
          {BRAND.company},” “we,” “us,” or “our”).
          <br />
          <br />
          By creating an account, uploading a document, buying a verification
          run, using the Service, or clicking to accept these Terms, you agree
          to these Terms. If you use the Service on behalf of a firm, company,
          organization, client, or other entity, you represent that you have
          authority to bind that entity, and “you” includes that entity.
        </>
      }
    >
      <LegalSection id="what-baddielegal-does" title="1. What BaddieLegal Does">
        <LegalP>
          {BRAND.company} provides a machine-assisted pre-filing verification
          workflow. The Service may help users identify, extract, normalize, and
          check legal citations, quoted language, metadata, AI-use disclosure
          language, and other filing-related items. The Service may generate
          on-screen results, downloadable reports, public verification
          summaries, private exception reports, audit metadata, and other
          related outputs.
        </LegalP>
        <LegalP>
          The Service is designed to support human review. It does not replace
          human judgment, legal research, legal advice, lawyer supervision, or
          professional responsibility.
        </LegalP>
      </LegalSection>

      <LegalSection id="no-legal-advice-no-attorney-client-relationship" title="2. No Legal Advice; No Attorney-Client Relationship">
        <LegalP>
          {BRAND.company} is not a law firm. {BRAND.company} does not provide
          legal advice, legal representation, legal opinions, litigation
          strategy, or legal services. Use of the Service does not create an
          attorney-client relationship, fiduciary relationship, attorney
          work-product relationship, or confidential legal relationship between
          you and {BRAND.company}.
        </LegalP>
        <LegalP>
          Outputs from the Service are not legal advice and should not be
          treated as legal advice. You are responsible for reviewing all
          outputs, verifying all authorities and facts, and deciding whether and
          how to file any document.
        </LegalP>
        <LegalP>
          If you are a self-represented litigant, the Service may help you
          review citations and filing-related issues, but it does not tell you
          what claims to bring, what arguments to make, whether your filing is
          correct, whether you are likely to win, or whether your document
          complies with every rule that applies to your case. You should
          consult a licensed attorney where possible.
        </LegalP>
        <LegalP>
          If you are an attorney or legal professional, you remain solely
          responsible for complying with all rules of professional conduct,
          duties of competence, confidentiality, candor, supervision, fee
          reasonableness, client communication, court rules, local rules, and
          filing obligations.
        </LegalP>
      </LegalSection>

      <LegalSection id="not-court-approved-no-filing-guarantee" title="3. Not Court-Approved; No Filing Guarantee">
        <LegalP>
          {BRAND.company} is not affiliated with, endorsed by, approved by, or
          certified by any court, clerk, judge, bar association, government
          agency, legal research provider, e-filing provider, or judicial body
          unless we state that relationship in writing.
        </LegalP>
        <LegalP>
          The Service does not guarantee that a filing will be accepted, that a
          court will approve or rely on a verification record, that a filing
          will avoid sanctions, that a citation is binding authority, that an
          argument is legally correct, or that a document complies with all
          applicable rules.
        </LegalP>
        <LegalP>
          Any public or private verification record confirms only the checks
          expressly listed in that record for the identified document version
          and time of review.
        </LegalP>
      </LegalSection>

      <LegalSection id="eligibility-and-accounts" title="4. Eligibility and Accounts">
        <LegalP>
          You must be at least 18 years old and legally able to enter into these
          Terms. You must provide accurate account information and keep it
          updated. You are responsible for maintaining the confidentiality of
          your login credentials and for all activity under your account.
        </LegalP>
        <LegalP>
          You must notify us promptly if you suspect unauthorized access to your
          account or documents.
        </LegalP>
      </LegalSection>

      <LegalSection id="user-roles-and-organizations" title="5. User Roles and Organizations">
        <LegalP>
          If you use the Service through a law firm, company, school, clinic,
          legal aid organization, or other workspace, your access may be
          controlled by workspace administrators. Administrators may invite
          users, remove users, manage billing, set retention policies, view
          usage, and access reports and audit records within the workspace.
        </LegalP>
        <LegalP>
          You are responsible for setting appropriate access permissions for
          your workspace and for ensuring that only authorized users access
          documents, reports, or verification records.
        </LegalP>
      </LegalSection>

      <LegalSection id="your-documents-and-content" title="6. Your Documents and Content">
        <LegalP>
          “Your Content” means documents, text, prompts, citations, files,
          metadata, comments, review decisions, reports you upload for
          processing, and any other information you submit to the Service.
        </LegalP>
        <LegalP>
          You retain ownership of Your Content. You grant {BRAND.company} a
          limited, non-exclusive, worldwide license to host, process, transmit,
          display, copy, parse, analyze, generate outputs from, and otherwise
          use Your Content only as needed to provide, secure, maintain, improve,
          support, and operate the Service, comply with law, enforce these
          Terms, and protect users and the Service.
        </LegalP>
        <LegalP>
          You represent and warrant that you have all rights, permissions,
          consents, and authority needed to upload and process Your Content
          through the Service. You must not upload documents unless you have the
          legal right and professional authority to do so.
        </LegalP>
      </LegalSection>

      <LegalSection id="confidentiality-and-sensitive-documents" title="7. Confidentiality and Sensitive Documents">
        <LegalP>
          The Service may process legal filings, drafts, case materials,
          personally identifiable information, confidential business
          information, privileged information, or other sensitive content. You
          are responsible for deciding whether the Service is appropriate for
          your use case and for complying with all confidentiality, privilege,
          court-sealing, protective-order, client-consent, and
          professional-obligation requirements.
        </LegalP>
        <LegalP>
          We use administrative, technical, and organizational safeguards
          designed to protect Your Content. No system is perfectly secure, and
          we do not guarantee absolute security.
        </LegalP>
      </LegalSection>

      <LegalSection id="ai-and-automated-processing" title="8. AI and Automated Processing">
        <LegalP>
          The Service may use deterministic scripts, citation parsers, source
          resolvers, OCR, document classification, machine learning, large
          language models, and other automated or AI-assisted systems.
        </LegalP>
        <LegalP>
          Automated systems can make mistakes. The Service may miss citations,
          misread text, incorrectly classify a statement, fail to retrieve a
          source, return incomplete results, or produce inaccurate outputs. You
          must independently review the outputs before relying on them or
          attaching any report to a filing.
        </LegalP>
        <LegalP>
          Unless you expressly opt in, {BRAND.company} will not use uploaded
          legal documents or extracted document text to train general-purpose
          AI models.
        </LegalP>
      </LegalSection>

      <LegalSection id="verification-records-reports-and-public-verification-pages" title="9. Verification Records, Reports, and Public Verification Pages">
        <LegalP>
          The Service may generate public-facing summaries, private exception
          reports, downloadable PDFs, audit metadata, hashes, timestamps, and
          verification IDs.
        </LegalP>
        <LegalP>
          A verification record is tied to a specific document version, hash,
          run ID, source coverage, and time of review. If you edit a document
          after verification, the prior verification record may no longer apply.
        </LegalP>
        <LegalP>
          Public verification pages may display limited metadata, such as
          verification ID, document hash, run timestamp, scope of checks,
          status, and counts. They should not include raw filing content or
          sensitive excerpts unless you choose a setting that allows such
          display.
        </LegalP>
        <LegalP>
          You are responsible for deciding whether to file, attach, share,
          publish, or rely on any verification record. {BRAND.company} does not
          control how courts, judges, clerks, opposing parties, clients, or
          other third parties interpret any report.
        </LegalP>
      </LegalSection>

      <LegalSection id="source-coverage-and-third-party-sources" title="10. Source Coverage and Third-Party Sources">
        <LegalP>
          The Service may check authorities against public, proprietary, court,
          commercial, government, or third-party data sources. Source
          availability may vary by jurisdiction, court, document type, date,
          citation type, subscription status, technical access, and data
          provider.
        </LegalP>
        <LegalP>
          Unresolved, unavailable, incomplete, or conflicting source data may
          reduce coverage. A “verified” result means only that the listed check
          passed against the source or sources identified in the report. It does
          not mean every possible source was checked.
        </LegalP>
        <LegalP>
          {BRAND.company} is not responsible for errors, omissions, downtime,
          access restrictions, fees, or changes in third-party databases, court
          systems, APIs, legal research providers, docket systems, or
          government portals.
        </LegalP>
      </LegalSection>

      <LegalSection id="acceptable-use" title="11. Acceptable Use">
        <LegalP>You agree not to:</LegalP>
        <LegalList
          items={[
            "use the Service for unlawful, fraudulent, deceptive, abusive, or harmful purposes;",
            "upload documents you are not authorized to process;",
            "use the Service to practice law without a license;",
            `represent that ${BRAND.company} is a court, law firm, attorney, government agency, bar association, or official filing authority;`,
            "falsely claim that a filing is court-approved, sanction-proof, legally correct, or guaranteed because it was processed by BaddieLegal;",
            "reverse engineer, scrape, overload, attack, or attempt unauthorized access to the Service;",
            "bypass usage limits, security controls, access controls, or billing systems;",
            "submit malware, malicious code, or harmful files;",
            "use outputs to mislead a court, tribunal, client, opposing party, or public body;",
            "remove, obscure, or alter disclaimers, limitations, hashes, status labels, or exception notices in a misleading way;",
            "use the Service in a way that violates court rules, professional rules, privacy laws, data protection laws, protective orders, or confidentiality duties.",
          ]}
        />
      </LegalSection>

      <LegalSection id="user-responsibilities-for-filings" title="12. User Responsibilities for Filings">
        <LegalP>You are solely responsible for:</LegalP>
        <LegalList
          items={[
            "the content, accuracy, and completeness of any filing;",
            "verifying all citations, quotations, factual assertions, legal arguments, procedural statements, record citations, exhibits, and attachments;",
            "deciding whether a filing must disclose AI use;",
            "deciding which disclosure or certification language applies;",
            "reviewing any unresolved exceptions before filing;",
            "obtaining client, employer, organization, or court permissions where required;",
            "complying with local rules, standing orders, administrative orders, court instructions, and filing procedures.",
          ]}
        />
        <LegalP>
          {BRAND.company} may provide templates or suggested language, but you
          are responsible for confirming whether the language is correct for
          your court and case.
        </LegalP>
      </LegalSection>

      <LegalSection id="payments-credits-and-subscriptions" title="13. Payments, Credits, and Subscriptions">
        <LegalP>
          Fees, plan terms, usage limits, overages, taxes, and payment terms
          are shown at checkout or in your order form. You authorize us and our
          payment processors to charge your selected payment method for fees and
          taxes.
        </LegalP>
        <LegalP>
          Unless stated otherwise, verification runs are charged when submitted
          or when processing begins. Failed uploads, unsupported file types,
          excessive file sizes, or user-canceled runs may still count against
          free trials or usage limits if we incur processing costs.
        </LegalP>
        <LegalP>
          Subscription fees renew until canceled. You may cancel future
          renewals through your account settings or by contacting support.
          Cancellation does not automatically refund prior charges unless
          required by law or stated in your plan.
        </LegalP>
      </LegalSection>

      <LegalSection id="free-trials-beta-features-and-early-access" title="14. Free Trials, Beta Features, and Early Access">
        <LegalP>
          We may offer free trials, previews, beta features, experimental
          checks, or early access functionality. These features may be limited,
          unstable, inaccurate, discontinued, changed, or removed at any time.
        </LegalP>
        <LegalP>
          Beta or experimental outputs should not be treated as final
          verification results unless marked as production-ready in the report.
        </LegalP>
      </LegalSection>

      <LegalSection id="retention-and-deletion" title="15. Retention and Deletion">
        <LegalP>
          Retention settings may vary by plan, workspace policy, document type,
          and user choice. We may delete raw uploads, extracted text, temporary
          files, and intermediate processing files after completion or after a
          short retention period, while retaining reports, hashes, run
          metadata, billing records, audit logs, and legally required records
          for longer periods.
        </LegalP>
        <LegalP>
          Deletion may not be instant across backups, logs, caches, soft-delete
          systems, payment records, security logs, or third-party processors. We
          will handle deletion according to our posted retention settings,
          Privacy Policy, legal obligations, security needs, and backup
          practices.
        </LegalP>
      </LegalSection>

      <LegalSection id="service-availability-and-changes" title="16. Service Availability and Changes">
        <LegalP>
          We may modify, suspend, limit, or discontinue any part of the Service
          at any time. We may impose file size limits, page limits, source
          limits, rate limits, usage limits, jurisdiction limits, or other
          technical constraints.
        </LegalP>
        <LegalP>
          We are not liable for delays, downtime, source outages, court-system
          outages, processing failures, lost uploads, or inability to generate a
          report, except where prohibited by law.
        </LegalP>
      </LegalSection>

      <LegalSection id="intellectual-property" title="17. Intellectual Property">
        <LegalP>
          {BRAND.company} and its licensors own all rights in the Service,
          software, workflows, interfaces, designs, models, code, trademarks,
          logos, templates, scoring systems, report formats, schemas,
          documentation, and other materials, except for Your Content.
        </LegalP>
        <LegalP>
          You may use reports and verification records generated for your own
          documents for internal review, client communication, filing support,
          and court submission, subject to these Terms. You may not copy,
          resell, white-label, scrape, or create competing services from the
          Service or its outputs without our written permission.
        </LegalP>
      </LegalSection>

      <LegalSection id="feedback" title="18. Feedback">
        <LegalP>
          If you provide ideas, suggestions, bug reports, or feedback, you grant{" "}
          {BRAND.company} a perpetual, irrevocable, worldwide, royalty-free
          right to use that feedback without restriction or compensation.
        </LegalP>
      </LegalSection>

      <LegalSection id="third-party-services" title="19. Third-Party Services">
        <LegalP>
          The Service may integrate with third-party services such as
          authentication providers, cloud hosting providers, storage providers,
          payment processors, analytics tools, email providers, AI providers,
          legal data providers, court data systems, and document-processing
          tools.
        </LegalP>
        <LegalP>
          Third-party services are governed by their own terms and policies.{" "}
          {BRAND.company} is not responsible for third-party products, data,
          outages, errors, pricing, or security practices, except where required
          by law.
        </LegalP>
      </LegalSection>

      <LegalSection id="disclaimers" title="20. Disclaimers">
        <LegalCallout>
          THE SERVICE AND ALL OUTPUTS ARE PROVIDED “AS IS” AND “AS AVAILABLE.”
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, {BRAND.company.toUpperCase()}{" "}
          DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE,
          NON-INFRINGEMENT, ACCURACY, COMPLETENESS, RELIABILITY, AVAILABILITY,
          SECURITY, AND ERROR-FREE OPERATION.
        </LegalCallout>
        <LegalCallout>
          {BRAND.company.toUpperCase()} DOES NOT WARRANT THAT THE SERVICE WILL
          DETECT EVERY FAKE CITATION, BAD QUOTE, UNSUPPORTED PROPOSITION,
          PROCEDURAL ERROR, RECORD-CITE ERROR, AI-DISCLOSURE ISSUE, FILING
          DEFECT, OR LEGAL ERROR.
        </LegalCallout>
        <LegalCallout>
          {BRAND.company.toUpperCase()} DOES NOT WARRANT THAT A COURT, CLERK,
          JUDGE, CLIENT, OPPOSING PARTY, BAR ASSOCIATION, INSURER, OR OTHER
          THIRD PARTY WILL ACCEPT, APPROVE, RELY ON, OR GIVE WEIGHT TO ANY
          REPORT OR VERIFICATION RECORD.
        </LegalCallout>
      </LegalSection>

      <LegalSection id="limitation-of-liability" title="21. Limitation of Liability">
        <LegalCallout>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, {BRAND.company.toUpperCase()}{" "}
          WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
          EXEMPLARY, PUNITIVE, OR ENHANCED DAMAGES; LOST PROFITS; LOST REVENUE;
          LOST BUSINESS; LOSS OF GOODWILL; LOSS OF DATA; LOSS OF PRIVILEGE; LOSS
          OF CONFIDENTIALITY; COURT SANCTIONS; ADVERSE RULINGS; MISSED
          DEADLINES; REJECTED FILINGS; LEGAL FEES; MALPRACTICE CLAIMS; OR OTHER
          PROFESSIONAL, LEGAL, OR BUSINESS CONSEQUENCES ARISING FROM OR RELATED
          TO THE SERVICE.
        </LegalCallout>
        <LegalCallout>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, {BRAND.company.toUpperCase()}’S
          TOTAL LIABILITY FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE
          WILL NOT EXCEED THE GREATER OF: (A) THE AMOUNTS YOU PAID TO{" "}
          {BRAND.company.toUpperCase()} FOR THE SERVICE GIVING RISE TO THE CLAIM
          DURING THE THREE MONTHS BEFORE THE EVENT GIVING RISE TO LIABILITY; OR
          (B) $100.
        </LegalCallout>
        <LegalP>
          Some jurisdictions do not allow certain limitations of liability. In
          those jurisdictions, the limitations apply to the fullest extent
          permitted by law.
        </LegalP>
      </LegalSection>

      <LegalSection id="indemnification" title="22. Indemnification">
        <LegalP>
          You will defend, indemnify, and hold harmless {BRAND.company}, its
          affiliates, officers, directors, employees, contractors, agents,
          service providers, and licensors from and against any claims,
          damages, liabilities, losses, costs, and expenses, including
          reasonable attorneys’ fees, arising from or related to:
        </LegalP>
        <LegalList
          items={[
            "Your Content;",
            "your use or misuse of the Service;",
            "your filings, reports, verification records, or public statements;",
            "your violation of these Terms;",
            "your violation of law, court rules, professional rules, confidentiality duties, protective orders, privacy rights, or third-party rights;",
            "your representation that a report means more than it says;",
            "your unauthorized upload or processing of documents.",
          ]}
        />
      </LegalSection>

      <LegalSection id="suspension-and-termination" title="23. Suspension and Termination">
        <LegalP>
          We may suspend or terminate your access if we believe you violated
          these Terms, created risk for the Service or other users, failed to
          pay fees, used the Service unlawfully, or caused legal, security,
          operational, or reputational risk.
        </LegalP>
        <LegalP>
          You may stop using the Service at any time. Certain sections of these
          Terms will survive termination, including ownership, disclaimers,
          limitation of liability, indemnification, payment obligations,
          retention, dispute resolution, and any provisions that by their nature
          should survive.
        </LegalP>
      </LegalSection>

      <LegalSection id="governing-law" title="24. Governing Law">
        <LegalP>
          These Terms are governed by the laws of the State of{" "}
          {LEGAL.governingState}, without regard to conflict-of-law rules,
          except where federal law applies or where consumer-protection law
          requires otherwise.
        </LegalP>
      </LegalSection>

      <LegalSection id="dispute-resolution-arbitration-class-action-waiver" title="25. Dispute Resolution; Arbitration; Class Action Waiver">
        <LegalCallout>
          Arbitration and class-action waivers may be limited by law, may
          require special notice, and may not apply to all users or claims.
        </LegalCallout>
        <LegalP>
          Except for small claims, intellectual property claims, or claims for
          injunctive relief, any dispute arising from or related to these Terms
          or the Service will be resolved by binding arbitration administered by{" "}
          {LEGAL.arbitrationAdmin} under its applicable rules. The arbitration
          will take place in {LEGAL.arbitrationVenue}, unless the parties agree
          to remote proceedings or another location.
        </LegalP>
        <LegalP>
          You and {BRAND.company} agree to bring claims only in an individual
          capacity and not as a plaintiff or class member in any class,
          collective, consolidated, representative, or private-attorney-general
          action, to the maximum extent permitted by law.
        </LegalP>
      </LegalSection>

      <LegalSection id="changes-to-these-terms" title="26. Changes to These Terms">
        <LegalP>
          We may update these Terms from time to time. The updated Terms will be
          posted with a new “Last updated” date. If changes are material, we may
          provide additional notice. Continued use of the Service after the
          effective date of updated Terms means you accept the updated Terms.
        </LegalP>
      </LegalSection>

      <LegalSection id="contact" title="27. Contact">
        <LegalP>
          Questions about these Terms may be sent to {LEGAL.entityName} at the
          address and emails below.
        </LegalP>
      </LegalSection>
    </LegalPage>
  );
}
