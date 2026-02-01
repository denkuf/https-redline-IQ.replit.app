import { db } from "./db";
import { contracts } from "@shared/schema";
import { sql } from "drizzle-orm";

const sampleContracts = [
  {
    name: "Standard Apartment Lease Agreement",
    type: "lease",
    extractedText: `RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into as of January 15, 2025, by and between:

LANDLORD: ABC Property Management LLC, located at 123 Main Street, Suite 100, New York, NY 10001 ("Landlord")

TENANT: [Tenant Name], ("Tenant")

PREMISES: The property located at 456 Oak Avenue, Apartment 3B, New York, NY 10002 ("Premises")

1. LEASE TERM
The lease term shall begin on February 1, 2025 and shall continue for a period of twelve (12) months, ending on January 31, 2026, unless terminated earlier in accordance with the terms of this Agreement.

2. RENT
Monthly rent shall be $2,500.00, due on the first day of each month. Late payment fee of $150.00 will be assessed if rent is not received by the 5th of the month.

3. SECURITY DEPOSIT
Tenant shall pay a security deposit of $5,000.00 (two months' rent) upon execution of this Agreement. The security deposit shall be returned within 30 days after lease termination, less any deductions for damages beyond normal wear and tear.

4. AUTOMATIC RENEWAL
This lease shall automatically renew for successive one-year terms unless either party provides written notice of intent not to renew at least 60 days prior to the expiration of the current term. Upon automatic renewal, rent may be increased by up to 5% at Landlord's discretion.

5. UTILITIES
Tenant is responsible for all utilities including electricity, gas, water, cable, and internet services.

6. MAINTENANCE AND REPAIRS
Tenant shall maintain the Premises in good condition. Tenant is responsible for repairs of damage caused by Tenant or Tenant's guests. Landlord is responsible for maintaining building common areas and structural repairs.

7. ENTRY BY LANDLORD
Landlord may enter the Premises with 24 hours notice for inspections, repairs, or to show the property to prospective tenants or buyers. In case of emergency, no notice is required.

8. TERMINATION
Early termination by Tenant requires payment of a fee equal to two months' rent plus forfeiture of the security deposit. Landlord may terminate this Agreement with 30 days notice for lease violations.

9. PETS
No pets are allowed without prior written consent from Landlord. Pet deposit of $500 and monthly pet rent of $50 apply.

10. ALTERATIONS
Tenant may not make any alterations, additions, or improvements to the Premises without prior written consent from Landlord. All approved alterations become property of Landlord.

11. INDEMNIFICATION
Tenant agrees to indemnify and hold harmless Landlord from any and all claims, actions, damages, liability, and expense in connection with loss of life, personal injury, or damage to property arising from Tenant's use of the Premises.

12. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of the State of New York.

13. DISPUTE RESOLUTION
Any disputes arising under this Agreement shall be resolved through binding arbitration in New York County, NY in accordance with the rules of the American Arbitration Association.

SIGNATURES:

Landlord: ___________________________ Date: ___________
Tenant: ____________________________ Date: ___________`,
    status: "completed",
    analysis: {
      summary: {
        whatItIs: "A 12-month residential apartment lease in New York City between ABC Property Management LLC and a tenant for Apartment 3B at 456 Oak Avenue.",
        partiesInvolved: ["ABC Property Management LLC (Landlord)", "Tenant (you)"],
        userObligations: [
          "Pay $2,500 monthly rent by the 1st of each month",
          "Pay security deposit of $5,000 (two months' rent)",
          "Maintain premises in good condition",
          "Pay all utilities (electricity, gas, water, cable, internet)",
          "No pets without written consent and additional fees",
          "No alterations without prior written approval"
        ],
        otherPartyObligations: [
          "Maintain building common areas",
          "Handle structural repairs",
          "Return security deposit within 30 days after lease ends (minus deductions)",
          "Provide 24 hours notice before entering premises (except emergencies)"
        ],
        datesAndTerms: "February 1, 2025 - January 31, 2026 (12 months). Auto-renews annually unless 60 days notice given."
      },
      keyTerms: [
        { category: "Payment/Price", value: "$2,500/month rent, $5,000 security deposit", notes: "$150 late fee if paid after 5th" },
        { category: "Term Length", value: "12 months", notes: "February 1, 2025 - January 31, 2026" },
        { category: "Renewal", value: "Automatic annual renewal", notes: "60 days notice required to cancel, up to 5% rent increase" },
        { category: "Cancellation/Termination", value: "Two months rent + forfeit deposit for early termination", notes: "Very expensive to break lease early" },
        { category: "Dispute Resolution", value: "Binding arbitration in New York County", notes: "You cannot sue in court" },
        { category: "Governing Law", value: "State of New York", notes: null }
      ],
      riskFlags: [
        {
          title: "Expensive Early Termination",
          severity: "High",
          explanation: "If you need to leave before the lease ends, you must pay two months' rent PLUS lose your entire $5,000 security deposit. This could cost you $10,000 total.",
          clauseQuote: "Early termination by Tenant requires payment of a fee equal to two months' rent plus forfeiture of the security deposit.",
          clauseReference: "Section 8 - Termination",
          confidence: 0.95
        },
        {
          title: "Automatic Renewal with Rent Increase",
          severity: "Medium",
          explanation: "The lease automatically renews each year unless you give 60 days notice. Upon renewal, rent can increase up to 5% without negotiation. You might forget and be locked in for another year at higher rent.",
          clauseQuote: "This lease shall automatically renew for successive one-year terms unless either party provides written notice... rent may be increased by up to 5%",
          clauseReference: "Section 4 - Automatic Renewal",
          confidence: 0.92
        },
        {
          title: "Binding Arbitration Only",
          severity: "Medium",
          explanation: "If you have a dispute with the landlord, you cannot go to court. You must use binding arbitration, which can be more expensive and may favor landlords who use it frequently.",
          clauseQuote: "Any disputes arising under this Agreement shall be resolved through binding arbitration",
          clauseReference: "Section 13 - Dispute Resolution",
          confidence: 0.88
        },
        {
          title: "Broad Indemnification Clause",
          severity: "Medium",
          explanation: "You agree to protect the landlord from all claims related to your use of the apartment, which could include things not directly your fault.",
          clauseQuote: "Tenant agrees to indemnify and hold harmless Landlord from any and all claims... arising from Tenant's use of the Premises",
          clauseReference: "Section 11 - Indemnification",
          confidence: 0.85
        }
      ],
      overallAssessment: "This lease has several concerning clauses, particularly the expensive early termination fees and binding arbitration requirement. Before signing, try to negotiate: (1) reduce the early termination fee, (2) change arbitration to small claims court option, and (3) cap the auto-renewal rent increase at 3%. The rent and security deposit are fairly standard for NYC."
    }
  },
  {
    name: "Freelance Web Development Contract",
    type: "freelance",
    extractedText: `FREELANCE SERVICES AGREEMENT

This Freelance Services Agreement ("Agreement") is made effective as of the date of last signature below.

BETWEEN:
Client: TechStart Innovations Inc., a Delaware corporation ("Client")
Contractor: [Your Name], an independent contractor ("Contractor")

1. SERVICES
Contractor agrees to provide web development services including:
- Custom website design and development
- Frontend implementation using React
- Backend API development
- Database design and implementation
- Testing and deployment

Project: Company website redesign with e-commerce functionality

2. PAYMENT
Total project fee: $15,000
Payment schedule:
- 30% ($4,500) due upon signing
- 40% ($6,000) due upon delivery of design mockups
- 30% ($4,500) due upon final delivery and acceptance

Payment terms: Net 30 days from invoice date.
Late payments accrue interest at 1.5% per month.

3. TIMELINE
Project start: Upon receipt of initial payment
Design phase: 2 weeks
Development phase: 4 weeks
Testing and revisions: 2 weeks
Total estimated duration: 8 weeks

Delays caused by Client (late feedback, scope changes) will extend timeline accordingly.

4. REVISIONS
Contractor will provide up to three (3) rounds of revisions during the design phase and two (2) rounds during development. Additional revisions will be billed at $150/hour.

5. INTELLECTUAL PROPERTY
All work product, including designs, code, and documentation, shall become the property of Client upon receipt of final payment. Until final payment is received, Contractor retains all rights to the work.

6. SCOPE CHANGES
Any changes to the project scope must be agreed upon in writing and may result in additional fees and timeline adjustments.

7. CONFIDENTIALITY
Contractor agrees to keep confidential all non-public information about Client's business.

8. TERMINATION
Either party may terminate this Agreement with 14 days written notice. Upon termination:
- Client pays for all work completed to date
- If Client terminates without cause, Client pays a 25% termination fee on remaining contract value
- Contractor returns all Client materials

9. LIMITATION OF LIABILITY
Contractor's total liability shall not exceed the total fees paid under this Agreement. Contractor is not liable for indirect, incidental, or consequential damages.

10. INDEPENDENT CONTRACTOR
Contractor is an independent contractor, not an employee. Contractor is responsible for own taxes and benefits.

11. DISPUTE RESOLUTION
Disputes shall first attempt resolution through mediation. If mediation fails, disputes shall be resolved in the courts of Delaware.

SIGNATURES:

Client Representative: ___________________ Date: ___________
Title: ________________________________

Contractor: ____________________________ Date: ___________`,
    status: "completed",
    analysis: {
      summary: {
        whatItIs: "A freelance contract for web development services to redesign TechStart Innovations' website with e-commerce functionality. Total value: $15,000 over approximately 8 weeks.",
        partiesInvolved: ["TechStart Innovations Inc. (Client)", "Freelance Developer (you)"],
        userObligations: [
          "Design and develop custom website with e-commerce",
          "Implement frontend (React) and backend API",
          "Complete project within 8 weeks (barring client delays)",
          "Provide up to 3 design revision rounds and 2 development rounds",
          "Keep client business information confidential",
          "Return all client materials upon termination"
        ],
        otherPartyObligations: [
          "Pay $4,500 (30%) upon signing",
          "Pay $6,000 (40%) upon design delivery",
          "Pay $4,500 (30%) upon final delivery",
          "Provide timely feedback",
          "Approve scope changes in writing"
        ],
        datesAndTerms: "8-week project. Payment in 3 milestones. Net 30 payment terms."
      },
      keyTerms: [
        { category: "Payment/Price", value: "$15,000 total in 3 milestone payments", notes: "30% upfront, 40% at design, 30% at completion" },
        { category: "Term Length", value: "8 weeks estimated", notes: "Can extend due to client delays" },
        { category: "Cancellation/Termination", value: "14 days notice required", notes: "Client pays 25% fee if terminating without cause" },
        { category: "Liability/Indemnity", value: "Limited to total fees paid", notes: "No consequential damages" },
        { category: "Confidentiality/IP", value: "IP transfers upon final payment", notes: "You retain rights until fully paid" }
      ],
      riskFlags: [
        {
          title: "Late Payment Risk",
          severity: "Medium",
          explanation: "Net 30 payment terms mean you could complete work and wait over a month for payment. The 1.5% monthly interest is reasonable but enforcing it may be difficult.",
          clauseQuote: "Payment terms: Net 30 days from invoice date.",
          clauseReference: "Section 2 - Payment",
          confidence: 0.85
        },
        {
          title: "Limited Revision Rounds",
          severity: "Low",
          explanation: "Be clear with the client upfront about what counts as a 'round' of revisions. 3 design and 2 development rounds is reasonable, and extra work is billable.",
          clauseQuote: "Additional revisions will be billed at $150/hour",
          clauseReference: "Section 4 - Revisions",
          confidence: 0.9
        }
      ],
      overallAssessment: "This is a fairly balanced freelance contract with good protections for both parties. The IP clause protecting you until final payment is smart. Consider: (1) requesting 50% upfront instead of 30% for better cash flow, and (2) adding a 'kill fee' if the project is cancelled mid-way. Overall, this is reasonable to sign with minor tweaks."
    }
  }
];

export async function seedDatabase() {
  try {
    // Check if we already have contracts
    const existing = await db.select({ count: sql`count(*)::int` }).from(contracts);
    const count = existing[0]?.count || 0;
    
    if (count > 0) {
      console.log(`Database already has ${count} contracts, skipping seed`);
      return;
    }

    // Insert sample contracts
    for (const contract of sampleContracts) {
      await db.insert(contracts).values(contract);
    }

    console.log(`Seeded ${sampleContracts.length} sample contracts`);
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
