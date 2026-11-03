/**
 * termsContent.ts — copy for the Withdraw "Terms & Conditions" screen, one
 * entry per withdrawal method. Verbatim from Figma:
 *   upi      — withdraw/upi/terms-conditions            (2898:166743)
 *   bank     — withdraw/bank-transfer/terms-conditions  (2898:166869)
 *   amazon   — withdraw/amazon-pay/terms-conditions      (2898:166847)
 *   flipkart — withdraw/flipkart-gift-card/terms-conditions (2898:166825)
 *
 * The screen picks the entry from its `variant` route param so each method's
 * consent link ("…listed here.") opens the matching terms.
 */
import type { WithdrawTermsVariant } from '../../navigation/types';

export type { WithdrawTermsVariant };

export interface TermsBlock {
  /** Body/14/SemiBold sub-heading (e.g. "Description"). */
  heading: string;
  /** A single paragraph (Body/14/Regular). */
  body?: string;
  /** Disc-bullet list. */
  bullets?: string[];
  /** A final bullet that ends in the tappable support email. The string is the
   *  text shown before the address; the email is appended as a link. */
  emailBullet?: string;
}

export interface TermsContent {
  /** Heading/18 section title at the top (e.g. "Amazon Pay Balance"). */
  title: string;
  blocks: TermsBlock[];
}

export const SUPPORT_EMAIL = 'contact@cashkaro.com';

// "Gift Card Usage" / "Refunds and Cancellations" / "Contact Support" repeat
// verbatim across the Amazon + Flipkart designs — shared here.
const REFUNDS_BLOCK: TermsBlock = {
  heading: 'Refunds and Cancellations',
  body: 'Cashback associated with cancelled, returned, or unconfirmed orders will not qualify for redemption as gift cards.',
};
const CONTACT_BLOCK: TermsBlock = {
  heading: 'Contact Support',
  body: 'For any queries related to your gift card or cashback, please reach out to our support team via the Help section.',
};

export const WITHDRAW_TERMS: Record<WithdrawTermsVariant, TermsContent> = {
  upi: {
    title: 'UPI',
    blocks: [
      {
        heading: 'Description',
        body: 'Upon requesting for withdrawal, amount will be transferred to the Customer’s bank account within 72 hours. Money requested will be transferred to ("Customer") bank account in full without any transfer charges.',
      },
      {
        heading: 'Terms & Conditions',
        bullets: [
          'Once requested, money will be transferred to your bank account within 5 minutes to 72 hours depending upon your bank.',
          'Transfer requests may take longer in case of weekends and bank holidays.',
          'Once a transfer request is made, it cannot be cancelled or reversed whatsoever.',
          'Customer shall ensure that the UPI Id entered is correct to avoid transfer to any incorrect bank account.',
          'Upon the receipt of payment from CashKaro, it shall be the responsibility of the Customer to manage such funds thereon.',
          'Any payments of over 2 Lakh INR will be subject to TDS deduction as per the applicable laws of India.',
        ],
        emailBullet:
          'Any query related to Bank Transfers made by CashKaro should only be raised with Cards.xtra by emailing on ',
      },
    ],
  },

  bank: {
    title: 'Bank Transfer',
    blocks: [
      {
        heading: 'Description',
        body: 'Upon requesting for withdrawal, amount will be transferred to the Customer’s bank account within 72 hours. Money requested will be transferred to ("Customer") bank account in full without any transfer charges.',
      },
      {
        heading: 'Terms & Conditions',
        bullets: [
          'Once requested, money will be transferred to your bank account within 5 minutes to 72 hours depending upon your bank.',
          'Transfer requests may take longer in case of weekends and bank holidays.',
          'Once a transfer request is made, it cannot be cancelled or reversed whatsoever.',
          'Customer shall ensure that the bank details entered are correct to avoid transfer to any incorrect bank account.',
          'Upon the receipt of payment from Cards.xtra, it shall be the responsibility of the Customer to manage such funds there on.',
          'Any payments of over 2 Lakh INR will be subject to TDS deduction as per the applicable laws of India.',
        ],
        emailBullet:
          'Any query related to Bank Transfers made by Cards.xtra should only be raised with Cards.xtra by emailing on ',
      },
    ],
  },

  amazon: {
    title: 'Amazon Pay Balance',
    blocks: [
      {
        heading: 'Description',
        body: 'Upon requesting for withdrawal, Amazon Pay Gift Card will be instantly loaded into customer’s Amazon Pay Balance or emailed to the customer. ("Customers") can use their Amazon Pay Balance to shop across 16Cr+ products on Amazon.in, do utility bill payments, book flight/train/movie tickets & purchase vouchers of 150+ partner brands on Amazon.in except apps, certain global store products and other Amazon Pay gift cards. Not only this, Amazon Pay Balance can be used to pay on 10,000+ 3rd party merchants like Redbus, BookMyShow, MakeMyTrip, Netmeds, Faasos, Fresh menu, Housejoy.in etc',
      },
      {
        heading: 'Terms & Conditions',
        bullets: [
          'Amazon Gift Cards ("GCs") are issued by the Qwikcilver Solutions Private limited ("Qwikcilver"). Credit and Debit Cards issued outside India cannot be used to purchase Amazon.in Gift Cards.',
          'Amazon Pay Balance is a sum of all balances associated with the GCs in your Amazon.in account.',
          'Amazon Pay Balance are redeemable across all products on Amazon.in except apps, certain global store products and other Amazon.in gift cards.',
          'Amazon Pay Balance must be used only towards the purchase of eligible products on amazon.in',
          'The GCs, including any unused Amazon Pay Balance, expire one year from the date of issuance of the GC',
          'GCs cannot be transferred for value or redeemed for the cash.',
          'CashKaro, Qwikcilver, Amazon Seller Services Private Limited (Amazon) or their affiliates are not responsible if a GC is lost, stolen, destroyed or used without permission.',
          'For Complete terms & conditions, see http://www.amazon.in/giftcardtnc',
          'Amazon.in logo/trademark is an IP of Amazon or its affiliates, CashKaro.com logo/trademark is an IP of CashKaro and the Qwikcilver trademark/logo is an IP of Qwikcilver.',
          'No returns and no refunds on gift cards, e-gift cards and gift vouchers shipped by woohoo.in. Please check the refund policy at http://www.woohoo.in/faq for further details.',
          'Once Amazon Pay Balance or GC’s are issued by CashKaro, they cannot be returned or cancelled under any conditions whatsoever.',
          'The Customer is aware, understands and acknowledges that the Gift Cards/Amazon Pay Balance cannot be exchanged for its value in cash either in full or in part.',
          'The Customer shall utilize the Gift Cards/Amazon Pay Balance procured only towards his/her personal consumption. The GC IDs or the Gift Cards or Amazon Pay Balance shall not be resold by the Customer in any manner whatsoever.',
        ],
        emailBullet:
          'Any query related to Amazon GC’s or Amazon Pay Balance issued by CashKaro should only be raised with CashKaro by emailing on ',
      },
      {
        heading: 'Gift Card Usage',
        // Figma's Amazon "Gift Card Usage" paragraph is a copy-paste of the
        // Flipkart text ("redeemable only on the Flipkart platform"); corrected
        // here to describe Amazon Pay Balance.
        body: 'The Amazon Pay Balance is redeemable on Amazon.in and at partner merchants. It is valid for one year from the date of issue and cannot be exchanged for cash.',
      },
      REFUNDS_BLOCK,
      CONTACT_BLOCK,
    ],
  },

  flipkart: {
    title: 'Flipkart Gift Card',
    blocks: [
      {
        heading: 'Cashback Confirmation',
        body: 'Upon requesting for withdrawal, Flipkart Gift Card/s will be emailed to the customers within 72 hours. (“Customer”) can use these Gift Cards to shop across millions of products across multiple product categories like electronics, fashion, beauty etc on Flipkart.com.',
      },
      {
        heading: 'Gift Card Delivery',
        bullets: [
          'Flipkart Gift Cards ("GCs") are issued by the Qwikcilver Solutions Private limited ("Qwikcilver"). Credit and Debit Cards issued outside India cannot be used to purchase Flipkart.com Gift Cards.',
          'Once requested, you will be emailed the Gift card number and PIN that you will need to enter on Flipkart platform at the designated place.',
          'Once the Gift Card is entered in your Flipkart account, it is linked to that account and cannot be delinked, removed, deleted or cancelled whatsoever.',
          'The GCs, including any unused Gift Cards loaded to your Flipkart account, expire one year from the date of issuance of the GC.',
          'GCs cannot be transferred for value or redeemed for the cash',
          'CashKaro, Qwikcilver, Flipkart Internet Private Limited (Flipkart) or their affiliates are not responsible if a GC is lost, stolen, destroyed or used without permission.',
          'Flipkart.com logo/trademark is an IP of Flipkart or its affiliates, CashKaro.com logo/trademark is an IP of CashKaro and the Qwikcilver trademark/logo is an IP of Qwikcilver.',
          'Upon the receipt of the GC IDs, it shall be the responsibility of the customers to keep the same in a secured manner and damages arising due to any loss and/or misuse of the GC ID shall be borne by the Customers.',
          'Once Flipkart Gift Cards (GC’s) are issued by CashKaro, they cannot be returned or cancelled under any conditions whatsoever.',
          'The customers is aware, understands and acknowledges that the Gift Cards cannot be exchanged for its value in cash either in full or in part.',
          'The customers shall utilize the Gift Cards procured only towards his/her personal consumption. The GC IDs or the Gift Cards shall not be resold by the customers in any manner whatsoever.',
        ],
        emailBullet:
          'Any query related to Flipkart GC’s/Flipkart Gift Cards issued by CashKaro should only be raised with CashKaro by emailing on ',
      },
      {
        heading: 'Gift Card Usage',
        body: 'The Flipkart Gift Card is redeemable only on the Flipkart platform. It is valid for one year from the date of issue and cannot be exchanged for cash.',
      },
      REFUNDS_BLOCK,
      CONTACT_BLOCK,
    ],
  },
};
