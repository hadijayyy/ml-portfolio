export const policies = [
  {id:"POL-DELIVERY",intent:"order_status",title:"Delayed delivery",text:"If the promised delivery date has passed and carrier tracking is stalled, support may open a carrier investigation. Replacement or refund requires confirmation that the package is lost or an authorized exception."},
  {id:"POL-REFUND",intent:"refund_request",title:"Refund policy",text:"Delivered goods are eligible for refund within 30 days when return conditions are met. Monetary refunds are never executed automatically by the demo and require human approval."},
  {id:"POL-RETURN",intent:"return_request",title:"Returns",text:"Standard items may be returned within 30 days in returnable condition. A prepaid label may be offered when the return is approved."},
  {id:"POL-CANCEL",intent:"cancel_order",title:"Order cancellation",text:"Orders may be cancelled before carrier handoff. Once shipped, support should use return or delivery-intercept procedures instead."},
  {id:"POL-DAMAGE",intent:"damaged_item",title:"Damaged goods",text:"When damage is reported after delivery, collect evidence and offer replacement or refund according to stock and approval rules. Financial action requires approval."},
  {id:"POL-WRONG",intent:"wrong_item",title:"Wrong item",text:"If fulfilled SKU differs from ordered SKU, offer a prepaid return and replacement. Refund requires approval."},
  {id:"POL-PAYMENT",intent:"payment_issue",title:"Payment exceptions",text:"Duplicate captured charges should be reconciled against the payment ledger. Any credit, void, or refund requires human approval."},
  {id:"POL-ACCOUNT",intent:"account_access",title:"Account recovery",text:"Use verified account recovery. Never reveal passwords, authentication tokens, or security answers."}
];
