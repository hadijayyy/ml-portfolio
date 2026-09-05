export const customers = [
  {customerId:"CUST-001",name:"Maya Chen",tier:"Plus",email:"maya@example.test",risk:"low",lifetimeOrders:14},
  {customerId:"CUST-002",name:"Arjun Patel",tier:"Standard",email:"arjun@example.test",risk:"low",lifetimeOrders:4},
  {customerId:"CUST-003",name:"Sofia Reyes",tier:"Plus",email:"sofia@example.test",risk:"low",lifetimeOrders:22},
  {customerId:"CUST-004",name:"Daniel Kim",tier:"Standard",email:"daniel@example.test",risk:"medium",lifetimeOrders:2},
  {customerId:"CUST-005",name:"Nadia Putri",tier:"Standard",email:"nadia@example.test",risk:"low",lifetimeOrders:7}
];

export const orders = [
  {orderId:"ORD-1001",customerId:"CUST-001",status:"shipped",orderedAt:"2026-08-28",expectedDelivery:"2026-09-02",carrierStatus:"in_transit_delayed",carrier:"NorthStar",total:129.00,currency:"USD",items:[{sku:"SKU-A11",name:"Wireless Headphones",qty:1}],fulfilledSku:["SKU-A11"]},
  {orderId:"ORD-1002",customerId:"CUST-002",status:"delivered",orderedAt:"2026-08-25",expectedDelivery:"2026-08-31",carrierStatus:"delivered",carrier:"NorthStar",total:84.50,currency:"USD",items:[{sku:"SKU-B20",name:"Ceramic Cookware Set",qty:1}],fulfilledSku:["SKU-B20"],damageClaim:true},
  {orderId:"ORD-1003",customerId:"CUST-003",status:"processing",orderedAt:"2026-09-04",expectedDelivery:"2026-09-09",carrierStatus:"not_handed_off",carrier:null,total:219.00,currency:"USD",items:[{sku:"SKU-C07",name:"Standing Desk",qty:1}],fulfilledSku:[]},
  {orderId:"ORD-1004",customerId:"CUST-004",status:"delivered",orderedAt:"2026-08-29",expectedDelivery:"2026-09-03",carrierStatus:"delivered",carrier:"ParcelOne",total:58.00,currency:"USD",items:[{sku:"SKU-D15",name:"Running Shoes / Black",qty:1}],fulfilledSku:["SKU-D16"]},
  {orderId:"ORD-1005",customerId:"CUST-005",status:"delivered",orderedAt:"2026-09-01",expectedDelivery:"2026-09-04",carrierStatus:"delivered",carrier:"ParcelOne",total:46.00,currency:"USD",items:[{sku:"SKU-E02",name:"Skin Care Set",qty:1}],fulfilledSku:["SKU-E02"]},
  {orderId:"ORD-1006",customerId:"CUST-001",status:"delivered",orderedAt:"2026-08-20",expectedDelivery:"2026-08-25",carrierStatus:"delivered",carrier:"NorthStar",total:72.00,currency:"USD",items:[{sku:"SKU-F04",name:"Travel Backpack",qty:1}],fulfilledSku:["SKU-F04"]}
];

export const payments = [
  {paymentId:"PAY-5001",orderId:"ORD-1001",status:"captured",amount:129.00,method:"visa_4242",duplicate:false},
  {paymentId:"PAY-5002",orderId:"ORD-1002",status:"captured",amount:84.50,method:"mastercard_5454",duplicate:false},
  {paymentId:"PAY-5003",orderId:"ORD-1003",status:"authorized",amount:219.00,method:"visa_1111",duplicate:false},
  {paymentId:"PAY-5004",orderId:"ORD-1004",status:"captured",amount:58.00,method:"visa_9090",duplicate:false},
  {paymentId:"PAY-5005A",orderId:"ORD-1005",status:"captured",amount:46.00,method:"visa_8181",duplicate:false},
  {paymentId:"PAY-5005B",orderId:"ORD-1005",status:"captured",amount:46.00,method:"visa_8181",duplicate:true},
  {paymentId:"PAY-5006",orderId:"ORD-1006",status:"refunded",amount:72.00,method:"visa_4242",duplicate:false,refundStatus:"submitted",refundSubmittedAt:"2026-09-03"}
];
