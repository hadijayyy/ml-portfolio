export const benchmarkMeta = {
  name: "Bitext Customer Support LLM Chatbot Training Dataset",
  source: "https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset",
  repo: "https://github.com/bitext/customer-support-llm-chatbot-training-dataset",
  rows: 26872,
  intents: 27,
  categories: 10,
  license: "CDLA-Sharing-1.0",
  usage: "Intent taxonomy/reference benchmark; demo cases below are curated and paraphrased, not a bundled copy of the full dataset."
};

export const supportExamples = [
  {id:"ex-01",intent:"order_status",text:"Where is my order? The tracking has not moved for several days.",resolution:"Check fulfillment and carrier status before promising a replacement."},
  {id:"ex-02",intent:"order_status",text:"My delivery date passed and the package still has not arrived.",resolution:"Validate carrier events and expected-delivery policy, then escalate if the shipment is stalled."},
  {id:"ex-03",intent:"refund_request",text:"I want a refund for the order I received yesterday.",resolution:"Check refund eligibility, return window, payment state, and approval threshold."},
  {id:"ex-04",intent:"return_request",text:"How can I return an item that does not fit?",resolution:"Check return window, item condition rules, and return-label eligibility."},
  {id:"ex-05",intent:"cancel_order",text:"Please cancel my order before it ships.",resolution:"Verify fulfillment state; cancellation is possible only before carrier handoff."},
  {id:"ex-06",intent:"damaged_item",text:"The product arrived broken and the box was crushed.",resolution:"Collect damage evidence and determine replacement/refund route under damaged-goods policy."},
  {id:"ex-07",intent:"wrong_item",text:"You sent me the wrong product.",resolution:"Compare ordered SKU to fulfilled SKU and offer prepaid return plus replacement when mismatch is confirmed."},
  {id:"ex-08",intent:"payment_issue",text:"I was charged twice for one purchase.",resolution:"Check payment ledger for duplicate settled charges; issue financial action only with approval."},
  {id:"ex-09",intent:"payment_issue",text:"My card was charged but the order never completed.",resolution:"Reconcile payment authorization/capture against order creation before advising the customer."},
  {id:"ex-10",intent:"account_access",text:"I cannot log in to my account after resetting my password.",resolution:"Use account recovery flow; never expose credentials or security secrets."},
  {id:"ex-11",intent:"refund_request",text:"The refund still has not appeared on my card.",resolution:"Check refund transaction status and processor settlement window before escalating."},
  {id:"ex-12",intent:"return_request",text:"Can I return this item after opening the packaging?",resolution:"Check item-specific return eligibility and condition rules."}
];
