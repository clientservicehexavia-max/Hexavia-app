import type { Deal } from "@/redux/deal/deal.types";
import type { Partner } from "@/redux/partner/partner.types";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

const NA = "Not available";

export function formatReportAmount(value?: number | null) {
    if (value === undefined || value === null || Number.isNaN(value)) {
        return NA;
    }

    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
    }).format(value);
}

export function formatReportDate(value?: string | Date | null) {
    if (!value) return NA;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? NA : parsed.toLocaleDateString();
}

function escapeHtml(input?: string | number | boolean | null) {
    if (input === null || input === undefined || input === "") return NA;
    return String(input)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function safeText(input?: string | number | boolean | null) {
    return escapeHtml(input);
}

export function getDealFinancialSnapshot(deal: Deal) {
    const financial = deal.financialReconciliation;
    const isRevenueShare = deal.agreementType === "Revenue Share";
    const revenueSharePercentage = Number(
        financial?.revenueSharePercentage ?? deal.agreedPercentage ?? 0,
    );
    const revenueEntries = (financial?.revenueEntries || []).map((entry) => {
        const investmentAmount = Number(entry.investmentAmount || 0);
        const commissionPercentage = Number(
            entry.commissionPercentage ?? revenueSharePercentage,
        );
        const calculatedCommission = Number(
            entry.calculatedCommission ??
                (investmentAmount * commissionPercentage) / 100,
        );

        return {
            ...entry,
            investmentAmount,
            commissionPercentage,
            calculatedCommission,
        };
    });

    const totalRevenueGenerated = Number(
        financial?.totalRevenueGenerated ??
            revenueEntries.reduce(
                (sum, entry) => sum + Number(entry.investmentAmount || 0),
                0,
            ),
    );
    const totalPartnerEarnings = Number(
        financial?.totalPartnerEarnings ??
            revenueEntries.reduce(
                (sum, entry) => sum + Number(entry.calculatedCommission || 0),
                0,
            ),
    );

    const dealValue = isRevenueShare
        ? totalRevenueGenerated
        : Number(financial?.dealValue ?? deal.expectedDealValue ?? 0);
    const expectedPartnerReturn = isRevenueShare
        ? totalPartnerEarnings
        : Number(
              financial?.agreedAmount ??
                  deal.expectedPartnerReturn ??
                  deal.agreedFixedAmount ??
                  (deal.expectedDealValue && deal.agreedPercentage
                      ? (deal.expectedDealValue * deal.agreedPercentage) / 100
                      : 0),
          );
    const amountPaid = Number(financial?.amountPaid || 0);
    const balanceOutstanding =
        financial?.balanceOutstanding !== undefined
            ? Number(financial.balanceOutstanding || 0)
            : Math.max(expectedPartnerReturn - amountPaid, 0);

    return {
        dealValue,
        expectedPartnerReturn,
        revenueSharePercentage,
        totalRevenueGenerated,
        totalPartnerEarnings,
        revenueEntries,
        amountPaid,
        balanceOutstanding,
        paymentStatus: financial?.paymentStatus || "Not Due",
        approvalStatus: financial?.approvalStatus || "Pending",
    };
}

function getContributionSnapshot(deal: Deal) {
    const contribution = deal.nonFinancialContribution;
    return {
        introductions: Number(contribution?.numberOfIntroductions || 0),
        meetingsSecured: Number(contribution?.meetingsSecured || 0),
        strategicDoorsOpened: Number(contribution?.strategicDoorsOpened || 0),
        referralsConverted: Number(contribution?.referralsConverted || 0),
        followUpSupport: contribution?.followUpSupport,
        brandVisibilityCreated: contribution?.brandVisibilityCreated,
        relationshipStrength: contribution?.relationshipStrength,
        valueRating: contribution?.valueRating,
        contributionNotes: contribution?.contributionNotes,
    };
}

function tableRows(
    rows: [string, string | number | boolean | undefined | null][],
) {
    return rows
        .map(
            ([label, value]) =>
                `<tr><td class="k">${safeText(label)}</td><td>${safeText(value)}</td></tr>`,
        )
        .join("");
}

function emptyRow(label: string, colSpan: number) {
    return `<tr><td colspan="${colSpan}" class="empty">${safeText(label)}</td></tr>`;
}

function reportShell(title: string, subtitle: string, body: string) {
    const generatedAt = new Date();

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeText(title)}</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Inter, "Helvetica Neue", Arial, sans-serif;
    background: #eef2ff;
    color: #111827;
    margin: 0;
  }
  .page { width: 100%; padding: 32px 24px 48px; }
  .surface {
    max-width: 980px;
    margin: 0 auto;
    background: #fff;
    border-radius: 28px;
    padding: 32px;
    box-shadow: 0 25px 60px rgba(15, 23, 42, 0.14);
  }
  .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
  .h1 { font-size: 27px; margin: 0; font-weight: 800; }
  .subtitle { margin-top: 6px; color: #6b7280; font-size: 14px; }
  .chips { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
  .chip {
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: #eef2ff;
    color: #312e81;
  }
  .chip.subtle { background: #f3f4f6; color: #4b5563; }
  .meta {
    margin-top: 22px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px 20px;
    font-size: 13px;
    color: #475467;
  }
  .stats {
    margin-top: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
  }
  .stat {
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    padding: 16px;
    background: #f9fafb;
  }
  .stat .label {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7280;
  }
  .stat .value {
    margin-top: 8px;
    font-size: 22px;
    font-weight: 800;
    color: #111827;
  }
  .section { margin-top: 30px; page-break-inside: avoid; }
  .section h2 { font-size: 16px; margin: 0 0 12px; }
  .table-wrap { border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead { background: #111827; color: #fff; }
  th {
    padding: 12px;
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  td {
    padding: 11px 12px;
    border-bottom: 1px solid #e5e7eb;
    color: #1f2937;
    vertical-align: top;
    overflow-wrap: anywhere;
  }
  tbody tr:nth-child(odd) { background: #f8fafc; }
  .k { width: 33%; font-weight: 700; color: #0f172a; }
  .empty { text-align: center; color: #6b7280; padding: 18px; }
  .footer {
    margin-top: 32px;
    font-size: 11px;
    color: #6b7280;
    letter-spacing: 0.08em;
    text-align: right;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="surface">
      <div class="header">
        <div>
          <div class="h1">${safeText(title)}</div>
          <div class="subtitle">${safeText(subtitle)}</div>
        </div>
        <div class="chips">
          <div class="chip">HEXAVIA</div>
          <div class="chip subtle">${safeText(generatedAt.toLocaleDateString())}</div>
        </div>
      </div>
      <div class="meta">
        <div><strong>Generated:</strong> ${safeText(generatedAt.toLocaleString())}</div>
        <div><strong>Report Type:</strong> ${safeText(title)}</div>
      </div>
      ${body}
      <div class="footer">Hexavia Partnership Tracker Report</div>
    </div>
  </div>
</body>
</html>`;
}

async function outputPdf(html: string, dialogTitle: string) {
    if (Platform.OS === "web") {
        await Print.printAsync({ html });
        return;
    }

    const file = await Print.printToFileAsync({ html });
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
        throw new Error("Sharing is not available on this device.");
    }

    await Sharing.shareAsync(file.uri, {
        UTI: "com.adobe.pdf",
        mimeType: "application/pdf",
        dialogTitle,
    });
}

function documentsForDeal(deal: Deal) {
    const docs = [...(deal.documents || [])];
    if (deal.financialReconciliation?.invoiceUrl) {
        docs.push({
            url: deal.financialReconciliation.invoiceUrl,
            type: "invoice",
            name: "Invoice",
            uploadedAt: deal.updatedAt,
        });
    }
    if (deal.financialReconciliation?.receiptUrl) {
        docs.push({
            url: deal.financialReconciliation.receiptUrl,
            type: "receipt",
            name: "Receipt",
            uploadedAt: deal.updatedAt,
        });
    }
    deal.financialReconciliation?.payments?.forEach((payment, index) => {
        if (payment.documentUrl) {
            docs.push({
                url: payment.documentUrl,
                type: "receipt",
                name:
                    payment.paymentReference || `Payment document ${index + 1}`,
                uploadedAt: payment.createdAt || payment.paymentDate,
            });
        }
    });
    return docs;
}

export async function generateDealReportPdf(deal: Deal, partner?: Partner) {
    const financial = getDealFinancialSnapshot(deal);
    const contribution = getContributionSnapshot(deal);
    const docs = documentsForDeal(deal);

    const activityRows = deal.activities?.length
        ? [...deal.activities]
              .sort(
                  (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime(),
              )
              .map(
                  (activity) =>
                      `<tr><td>${safeText(activity.activityType)}</td><td>${safeText(activity.note)}</td><td>${safeText(activity.createdBy)}</td><td>${safeText(formatReportDate(activity.date))}</td></tr>`,
              )
              .join("")
        : emptyRow("No activities logged.", 4);

    const paymentRows = deal.financialReconciliation?.payments?.length
        ? deal.financialReconciliation.payments
              .map(
                  (payment) =>
                      `<tr><td>${safeText(formatReportAmount(payment.amount))}</td><td>${safeText(formatReportDate(payment.paymentDate))}</td><td>${safeText(payment.paymentReference)}</td><td>${safeText(payment.notes)}</td><td>${safeText(payment.documentUrl)}</td></tr>`,
              )
              .join("")
        : emptyRow("No payment history available.", 5);

    const revenueRows = financial.revenueEntries?.length
        ? financial.revenueEntries
              .map(
                  (entry) =>
                      `<tr><td>${safeText(entry.investorName)}</td><td>${safeText(formatReportDate(entry.investmentDate))}</td><td>${safeText(formatReportAmount(entry.investmentAmount))}</td><td>${safeText(`${entry.commissionPercentage}%`)}</td><td>${safeText(formatReportAmount(entry.calculatedCommission))}</td><td>${safeText(entry.notes)}</td></tr>`,
              )
              .join("")
        : emptyRow("No revenue entries available.", 6);

    const contributionRows = deal.contributionLogs?.length
        ? deal.contributionLogs
              .map(
                  (item) =>
                      `<tr><td>${safeText(item.contributionType)}</td><td>${safeText(item.description)}</td><td>${safeText(item.valueRating)}</td><td>${safeText(formatReportDate(item.date))}</td><td>${safeText(item.notes)}</td></tr>`,
              )
              .join("")
        : emptyRow("No contribution logs available.", 5);

    const documentRows = docs.length
        ? docs
              .map(
                  (document) =>
                      `<tr><td>${safeText(document.name || document.type || "Document")}</td><td>${safeText(document.type)}</td><td>${safeText(formatReportDate(document.uploadedAt))}</td><td>${safeText(document.url)}</td></tr>`,
              )
              .join("")
        : emptyRow("No documents uploaded.", 4);

    const body = `
      <div class="stats">
                <div class="stat"><div class="label">${
                    deal.agreementType === "Revenue Share"
                        ? "Total Revenue Generated"
                        : "Deal Value"
                }</div><div class="value">${safeText(formatReportAmount(financial.dealValue))}</div></div>
                <div class="stat"><div class="label">${
                    deal.agreementType === "Revenue Share"
                        ? "Total Partner Earnings"
                        : "Partner Return"
                }</div><div class="value">${safeText(formatReportAmount(financial.expectedPartnerReturn))}</div></div>
        <div class="stat"><div class="label">Amount Paid</div><div class="value">${safeText(formatReportAmount(financial.amountPaid))}</div></div>
        <div class="stat"><div class="label">Outstanding</div><div class="value">${safeText(formatReportAmount(financial.balanceOutstanding))}</div></div>
      </div>

      <div class="section"><h2>Deal Overview</h2><div class="table-wrap"><table><tbody>${tableRows(
          [
              ["Deal title", deal.title],
              ["Linked partner", partner?.name || deal.partnerId],
              ["Deal source", deal.dealSource],
              ["Introduction type", deal.introductionType],
              ["Current stage/status", deal.stage],
              ["Agreement type", deal.agreementType],
              ["Assigned owner/internal manager", deal.assignedOwner],
              [
                  "Recurring revenue status",
                  deal.recurringRevenue ? "Yes" : "No",
              ],
              ["Recurring frequency", deal.recurringFrequency],
              ["Date created", formatReportDate(deal.createdAt)],
              ["Close date", formatReportDate(deal.closeDate)],
              ["Notes/description", deal.description],
          ],
      )}</tbody></table></div></div>

      <div class="section"><h2>Activities</h2><div class="table-wrap"><table><thead><tr><th>Type</th><th>Note</th><th>Created By</th><th>Date</th></tr></thead><tbody>${activityRows}</tbody></table></div></div>

      <div class="section"><h2>Financials</h2><div class="table-wrap"><table><tbody>${tableRows(
          deal.agreementType === "Revenue Share"
              ? [
                    [
                        "Revenue share %",
                        `${financial.revenueSharePercentage || 0}%`,
                    ],
                    [
                        "Total revenue generated",
                        formatReportAmount(financial.totalRevenueGenerated),
                    ],
                    [
                        "Total partner earnings",
                        formatReportAmount(financial.totalPartnerEarnings),
                    ],
                    ["Amount paid", formatReportAmount(financial.amountPaid)],
                    [
                        "Balance outstanding",
                        formatReportAmount(financial.balanceOutstanding),
                    ],
                    ["Payment status", financial.paymentStatus],
                    ["Approval status", financial.approvalStatus],
                    ["Invoice", deal.financialReconciliation?.invoiceUrl],
                    ["Receipt", deal.financialReconciliation?.receiptUrl],
                ]
              : [
                    ["Deal value", formatReportAmount(financial.dealValue)],
                    [
                        "Agreed percentage",
                        deal.agreedPercentage
                            ? `${deal.agreedPercentage}%`
                            : undefined,
                    ],
                    [
                        "Fixed amount",
                        formatReportAmount(deal.agreedFixedAmount),
                    ],
                    [
                        "Expected partner return",
                        formatReportAmount(financial.expectedPartnerReturn),
                    ],
                    ["Amount paid", formatReportAmount(financial.amountPaid)],
                    [
                        "Balance outstanding",
                        formatReportAmount(financial.balanceOutstanding),
                    ],
                    ["Payment status", financial.paymentStatus],
                    ["Approval status", financial.approvalStatus],
                    ["Invoice", deal.financialReconciliation?.invoiceUrl],
                    ["Receipt", deal.financialReconciliation?.receiptUrl],
                ],
      )}</tbody></table></div></div>

      ${
          deal.agreementType === "Revenue Share"
              ? `<div class="section"><h2>Revenue Entries</h2><div class="table-wrap"><table><thead><tr><th>Investor</th><th>Investment Date</th><th>Investment Amount</th><th>Commission %</th><th>Calculated Commission</th><th>Notes</th></tr></thead><tbody>${revenueRows}</tbody></table></div></div>`
              : ""
      }

      <div class="section"><h2>Payment History</h2><div class="table-wrap"><table><thead><tr><th>Amount</th><th>Date</th><th>Reference</th><th>Notes</th><th>Document</th></tr></thead><tbody>${paymentRows}</tbody></table></div></div>

      <div class="section"><h2>Contributions</h2><div class="table-wrap"><table><tbody>${tableRows(
          [
              ["Number of introductions", contribution.introductions],
              ["Meetings secured", contribution.meetingsSecured],
              ["Strategic doors opened", contribution.strategicDoorsOpened],
              ["Brand visibility created", contribution.brandVisibilityCreated],
              ["Referrals converted", contribution.referralsConverted],
              ["Follow-up support", contribution.followUpSupport],
              ["Relationship strength", contribution.relationshipStrength],
              ["Value rating", contribution.valueRating],
              ["Contribution notes", contribution.contributionNotes],
          ],
      )}</tbody></table></div></div>

      <div class="section"><h2>Contribution Log</h2><div class="table-wrap"><table><thead><tr><th>Type</th><th>Description</th><th>Value Rating</th><th>Date</th><th>Notes</th></tr></thead><tbody>${contributionRows}</tbody></table></div></div>

      <div class="section"><h2>Documents</h2><div class="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Uploaded</th><th>URL</th></tr></thead><tbody>${documentRows}</tbody></table></div></div>

      <div class="section"><h2>Summary</h2><div class="table-wrap"><table><tbody>${tableRows(
          [
              ["Current deal status", deal.stage],
              ["Financial status", financial.paymentStatus],
              [
                  "Pending actions",
                  deal.nextActionDate
                      ? `Next action due ${formatReportDate(deal.nextActionDate)}`
                      : financial.balanceOutstanding > 0
                        ? "Outstanding partner balance"
                        : "No pending actions recorded",
              ],
              [
                  "Reconciliation status",
                  financial.balanceOutstanding <= 0 &&
                  financial.approvalStatus === "Approved"
                      ? "Reconciled"
                      : "Pending reconciliation",
              ],
          ],
      )}</tbody></table></div></div>`;

    await outputPdf(
        reportShell("Deal Report", deal.title, body),
        `Deal Report - ${deal.title}`,
    );
}

export async function generatePartnerReportPdf(
    partner: Partner,
    deals: Deal[],
) {
    const linkedDeals = deals.filter((deal) => deal.partnerId === partner._id);
    const financialTotals = linkedDeals.reduce(
        (totals, deal) => {
            const snapshot = getDealFinancialSnapshot(deal);
            totals.dealValue += snapshot.dealValue;
            totals.expectedPartnerReturn += snapshot.expectedPartnerReturn;
            totals.revenueGenerated += snapshot.totalRevenueGenerated;
            totals.partnerEarnings += snapshot.totalPartnerEarnings;
            totals.paid += snapshot.amountPaid;
            totals.outstanding += snapshot.balanceOutstanding;
            if (snapshot.paymentStatus === "Disputed") totals.disputed += 1;
            if (snapshot.approvalStatus === "Pending")
                totals.pendingApprovals += 1;
            return totals;
        },
        {
            dealValue: 0,
            expectedPartnerReturn: 0,
            revenueGenerated: 0,
            partnerEarnings: 0,
            paid: 0,
            outstanding: 0,
            disputed: 0,
            pendingApprovals: 0,
        },
    );
    const contributionTotals = linkedDeals.reduce(
        (totals, deal) => {
            const contribution = getContributionSnapshot(deal);
            totals.introductions += contribution.introductions;
            totals.meetingsSecured += contribution.meetingsSecured;
            totals.strategicDoorsOpened += contribution.strategicDoorsOpened;
            totals.referralsConverted += contribution.referralsConverted;
            if (contribution.followUpSupport) totals.followUpSupport += 1;
            if (contribution.brandVisibilityCreated)
                totals.brandVisibilityCreated += 1;
            if (contribution.relationshipStrength)
                totals.relationshipStrength.push(
                    contribution.relationshipStrength,
                );
            if (contribution.valueRating)
                totals.valueRatings.push(contribution.valueRating);
            return totals;
        },
        {
            introductions: 0,
            meetingsSecured: 0,
            strategicDoorsOpened: 0,
            referralsConverted: 0,
            followUpSupport: 0,
            brandVisibilityCreated: 0,
            relationshipStrength: [] as string[],
            valueRatings: [] as string[],
        },
    );

    const linkedDealRows = linkedDeals.length
        ? linkedDeals
              .map((deal) => {
                  const snapshot = getDealFinancialSnapshot(deal);
                  return `<tr><td>${safeText(deal.title)}</td><td>${safeText(deal.stage)}</td><td>${safeText(deal.dealSource)}</td><td>${safeText(deal.agreementType)}</td><td>${safeText(formatReportAmount(snapshot.dealValue))}</td><td>${safeText(formatReportAmount(snapshot.expectedPartnerReturn))}</td><td>${safeText(formatReportAmount(snapshot.amountPaid))}</td><td>${safeText(formatReportAmount(snapshot.balanceOutstanding))}</td><td>${safeText(snapshot.paymentStatus)}</td><td>${safeText(snapshot.approvalStatus)}</td><td>${safeText(formatReportDate(deal.updatedAt))}</td></tr>`;
              })
              .join("")
        : emptyRow("No linked deals available.", 11);

    const documentRows = linkedDeals.flatMap((deal) =>
        documentsForDeal(deal).map((document) => ({
            dealTitle: deal.title,
            ...document,
        })),
    );

    const docsHtml = documentRows.length
        ? documentRows
              .map(
                  (document) =>
                      `<tr><td>${safeText(document.dealTitle)}</td><td>${safeText(document.name || document.type || "Document")}</td><td>${safeText(document.type)}</td><td>${safeText(formatReportDate(document.uploadedAt))}</td><td>${safeText(document.url)}</td></tr>`,
              )
              .join("")
        : emptyRow("No linked deal documents available.", 5);

    const closedWon = linkedDeals.filter(
        (deal) => deal.stage === "Closed Won",
    ).length;
    const closedLost = linkedDeals.filter(
        (deal) => deal.stage === "Closed Lost",
    ).length;
    const openDeals = linkedDeals.length - closedWon - closedLost;
    const relationshipStrength =
        contributionTotals.relationshipStrength[
            contributionTotals.relationshipStrength.length - 1
        ] || NA;
    const valueRating =
        contributionTotals.valueRatings[
            contributionTotals.valueRatings.length - 1
        ] || NA;
    const partnerPerformance =
        closedWon > 0 || financialTotals.dealValue > 0
            ? "Active contribution recorded"
            : "No performance data recorded";
    const financialStatus =
        financialTotals.outstanding > 0
            ? "Outstanding balance pending"
            : financialTotals.pendingApprovals > 0
              ? "Pending approvals"
              : "Settled or not due";

    const body = `
      <div class="stats">
        <div class="stat"><div class="label">Linked Deals</div><div class="value">${safeText(linkedDeals.length)}</div></div>
        <div class="stat"><div class="label">Closed Won</div><div class="value">${safeText(closedWon)}</div></div>
        <div class="stat"><div class="label">Total Deal Value</div><div class="value">${safeText(formatReportAmount(financialTotals.dealValue))}</div></div>
                <div class="stat"><div class="label">Revenue Generated</div><div class="value">${safeText(formatReportAmount(financialTotals.revenueGenerated))}</div></div>
                <div class="stat"><div class="label">Partner Earnings</div><div class="value">${safeText(formatReportAmount(financialTotals.partnerEarnings))}</div></div>
        <div class="stat"><div class="label">Outstanding</div><div class="value">${safeText(formatReportAmount(financialTotals.outstanding))}</div></div>
      </div>

      <div class="section"><h2>Partner Overview</h2><div class="table-wrap"><table><tbody>${tableRows(
          [
              ["Partner name", partner.name],
              ["Company name", partner.company],
              ["Email", partner.contactEmail],
              ["Phone", partner.contactPhone],
              ["Address", partner.address],
              ["Partner type", partner.partnerType],
              ["Status", partner.status],
              ["Notes", partner.notes],
          ],
      )}</tbody></table></div></div>

      <div class="section"><h2>Partner Performance Summary</h2><div class="table-wrap"><table><tbody>${tableRows(
          [
              [
                  "Total opportunities/deals linked to partner",
                  linkedDeals.length,
              ],
              ["Total closed won deals", closedWon],
              ["Total open opportunities", openDeals],
              ["Total closed lost deals", closedLost],
              [
                  "Total deal value generated",
                  formatReportAmount(financialTotals.dealValue),
              ],
              [
                  "Total commissions due",
                  formatReportAmount(financialTotals.expectedPartnerReturn),
              ],
              [
                  "Total revenue generated",
                  formatReportAmount(financialTotals.revenueGenerated),
              ],
              [
                  "Total partner earnings",
                  formatReportAmount(financialTotals.partnerEarnings),
              ],
              [
                  "Total commissions paid",
                  formatReportAmount(financialTotals.paid),
              ],
              [
                  "Total outstanding balance",
                  formatReportAmount(financialTotals.outstanding),
              ],
          ],
      )}</tbody></table></div></div>

      <div class="section"><h2>Linked Deals</h2><div class="table-wrap"><table><thead><tr><th>Deal</th><th>Status</th><th>Source</th><th>Agreement</th><th>Deal Value</th><th>Partner Return</th><th>Paid</th><th>Outstanding</th><th>Payment</th><th>Approval</th><th>Updated</th></tr></thead><tbody>${linkedDealRows}</tbody></table></div></div>

      <div class="section"><h2>Financial Summary</h2><div class="table-wrap"><table><tbody>${tableRows(
          [
              [
                  "Total deal value",
                  formatReportAmount(financialTotals.dealValue),
              ],
              [
                  "Total expected partner returns",
                  formatReportAmount(financialTotals.expectedPartnerReturn),
              ],
              [
                  "Total revenue generated",
                  formatReportAmount(financialTotals.revenueGenerated),
              ],
              [
                  "Total partner earnings",
                  formatReportAmount(financialTotals.partnerEarnings),
              ],
              ["Total paid", formatReportAmount(financialTotals.paid)],
              [
                  "Total outstanding",
                  formatReportAmount(financialTotals.outstanding),
              ],
              ["Disputed payments", financialTotals.disputed],
              ["Pending approvals", financialTotals.pendingApprovals],
          ],
      )}</tbody></table></div></div>

      <div class="section"><h2>Contribution Summary</h2><div class="table-wrap"><table><tbody>${tableRows(
          [
              ["Total introductions", contributionTotals.introductions],
              ["Total meetings secured", contributionTotals.meetingsSecured],
              [
                  "Total strategic doors opened",
                  contributionTotals.strategicDoorsOpened,
              ],
              [
                  "Total referrals converted",
                  contributionTotals.referralsConverted,
              ],
              ["Follow-up support", contributionTotals.followUpSupport],
              [
                  "Brand visibility created",
                  contributionTotals.brandVisibilityCreated,
              ],
              ["Overall relationship strength", relationshipStrength],
              ["Overall value rating", valueRating],
          ],
      )}</tbody></table></div></div>

      <div class="section"><h2>Documents</h2><div class="table-wrap"><table><thead><tr><th>Deal</th><th>Name</th><th>Type</th><th>Uploaded</th><th>URL</th></tr></thead><tbody>${docsHtml}</tbody></table></div></div>

      <div class="section"><h2>Summary</h2><div class="table-wrap"><table><tbody>${tableRows(
          [
              ["Partner performance status", partnerPerformance],
              ["Financial status", financialStatus],
              ["Contribution value", valueRating],
              [
                  "Pending actions",
                  financialTotals.outstanding > 0 ||
                  financialTotals.pendingApprovals > 0
                      ? "Review outstanding balances and approvals"
                      : openDeals > 0
                        ? "Continue active deal follow-up"
                        : "No pending actions recorded",
              ],
          ],
      )}</tbody></table></div></div>`;

    await outputPdf(
        reportShell("Partner Report", partner.name, body),
        `Partner Report - ${partner.name}`,
    );
}
