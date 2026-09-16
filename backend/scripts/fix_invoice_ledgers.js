const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    include: {
      payments: true,
      salesReturns: true,
    },
  });

  let updated = 0;

  for (const invoice of invoices) {
    const signedPayments = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const refundTotal = invoice.salesReturns.reduce((sum, salesReturn) => sum + Number(salesReturn.refundAmount || 0), 0);
    const amountPaid = signedPayments;
    const balance = Number(invoice.totalAmount || 0) - amountPaid + refundTotal;
    const status = balance <= 0 ? 'PAID' : balance < Number(invoice.totalAmount || 0) ? 'PARTIALLY_PAID' : 'ISSUED';

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: String(amountPaid),
        balance: String(balance),
        status,
      },
    });

    updated += 1;
  }

  console.log(`Updated ${updated} invoices.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
