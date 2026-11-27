import React, { useMemo, useRef, useState } from 'react';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { useStore } from '../context/StoreContext';
import { Order, OrderStatus, PromoCode } from '../types';

const TRACKING_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'Pending', label: 'Pending', icon: 'schedule' },
  { status: 'Confirmed', label: 'Confirmed', icon: 'verified' },
  { status: 'Preparing', label: 'Preparing', icon: 'skillet' },
  { status: 'Ready', label: 'Ready', icon: 'takeout_dining' },
  { status: 'Out for Delivery', label: 'On the Way', icon: 'two_wheeler' },
  { status: 'Delivered', label: 'Delivered', icon: 'check_circle' },
];

export const CartCheckoutPage: React.FC = () => {
  const {
    cart,
    cartCount,
    cartSubtotal,
    addToCart,
    decrementCartItem,
    removeCartItem,
    clearCart,
    promos,
    config,
    placeOrder,
    trackedOrderId,
    setTrackedOrderId,
    trackedOrder,
    trackedOrderLoading,
    trackedOrderError,
    setActiveTab,
    showToast,
  } = useStore();

  const trackerSectionRef = useRef<HTMLDivElement | null>(null);
  const [lookupInput, setLookupInput] = useState(trackedOrderId);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [customerName, setCustomerName] = useState('Muhammad Ali');
  const [phone, setPhone] = useState('0300-2489102');
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  const [altWhatsapp, setAltWhatsapp] = useState('');
  const [address, setAddress] = useState('House 42-B, Street 7, Block 4, Clifton, Karachi');
  const [landmark, setLandmark] = useState('Near Bilawal House roundabout');
  const [notes, setNotes] = useState(
    "Extra mint raita, well-charred kabaabs, please don't ring bell"
  );
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery (COD)');

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState('');

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [whatsappPreviewUrl, setWhatsappPreviewUrl] = useState<string | null>(null);
  const [whatsappMessageText, setWhatsappMessageText] = useState<string>('');
  const [formError, setFormError] = useState('');

  const discountAmount = useMemo(() => {
    if (!appliedPromo || cartSubtotal === 0) return 0;
    if (appliedPromo.discountType === 'fixed') {
      return Math.min(cartSubtotal, appliedPromo.discountValue);
    }
    return Math.round((cartSubtotal * appliedPromo.discountValue) / 100);
  }, [appliedPromo, cartSubtotal]);

  const effectiveSubtotal = Math.max(0, cartSubtotal - discountAmount);
  const deliveryFee = effectiveSubtotal > 0 ? config.deliveryFee : 0;
  const taxAmount = Math.round(effectiveSubtotal * 0.05);
  const grandTotal = effectiveSubtotal > 0 ? effectiveSubtotal + deliveryFee + taxAmount : 0;

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const found = promos.find((p) => p.code.toUpperCase() === code && p.active);
    if (found) {
      setAppliedPromo(found);
      setPromoError('');
      showToast(`Voucher ${found.code} applied!`);
    } else {
      setAppliedPromo(null);
      setPromoError('Invalid or inactive promo voucher code.');
    }
  };

  const validateForm = () => {
    if (cart.length === 0) {
      setFormError('Your feast bag is empty. Please add dishes before placing an order.');
      return false;
    }
    if (config.minimumOrder > 0 && cartSubtotal < config.minimumOrder) {
      setFormError(
        `Minimum order amount is Rs. ${config.minimumOrder.toLocaleString('en-PK')}. Add Rs. ${(
          config.minimumOrder - cartSubtotal
        ).toLocaleString('en-PK')} more to proceed.`
      );
      return false;
    }
    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      setFormError('Please fill in your Full Name, Mobile Phone Number, and Delivery Address.');
      return false;
    }
    setFormError('');
    return true;
  };

  const buildWhatsAppPayload = (order: Order) => {
    const contactPhone = sameWhatsapp ? phone : altWhatsapp || phone;
    const itemLines = order.items.map(
      (item) =>
        `• ${item.qty}x ${item.title} (Rs. ${(item.price * item.qty).toLocaleString('en-PK')})`
    );
    let msg = `*NEW ROYAL ORDER (${order.orderId}) - FAYYAZ KABAAB HOUSE*\n`;
    msg += `-----------------------------------------\n`;
    msg += `*Customer:* ${order.customerName}\n`;
    msg += `*Contact:* +92 ${contactPhone.trim()}\n`;
    msg += `*Delivery Address:* ${order.address}\n`;
    if (order.landmark) msg += `*Nearest Landmark:* ${order.landmark}\n`;
    msg += `*Payment:* ${order.paymentMethod}\n`;
    msg += `-----------------------------------------\n`;
    msg += `*ORDER ITEMS:*\n${itemLines.join('\n')}\n`;
    msg += `-----------------------------------------\n`;
    msg += `Subtotal: Rs. ${order.subtotal.toLocaleString('en-PK')}\n`;
    if (order.discountAmount > 0) {
      msg += `Voucher (${order.promoCode || 'PROMO'}): -Rs. ${order.discountAmount.toLocaleString(
        'en-PK'
      )}\n`;
    }
    msg += `Delivery: Rs. ${order.deliveryCharges.toLocaleString('en-PK')}\n`;
    msg += `GST (5%): Rs. ${order.taxAmount.toLocaleString('en-PK')}\n`;
    msg += `*TOTAL PAYABLE: Rs. ${order.totalBill.toLocaleString('en-PK')}*\n`;
    if (order.notes) msg += `\n*Kitchen Notes:* ${order.notes}`;

    const waDigits = config.whatsappLine.replace(/\D/g, '') || '923001234567';
    return {
      text: msg,
      url: `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`,
    };
  };

  const handleSubmitOrder = async (channel: 'whatsapp' | 'cod') => {
    if (!validateForm() || placingOrder) return;

    setPlacingOrder(true);
    setFormError('');
    try {
      const newOrder = await placeOrder({
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        landmark: landmark.trim(),
        notes: notes.trim(),
        paymentMethod,
        channel,
        promoCode: appliedPromo?.code,
      });

      if (channel === 'whatsapp') {
        const { text, url } = buildWhatsAppPayload(newOrder);
        setWhatsappMessageText(text);
        setWhatsappPreviewUrl(url);
      } else {
        setWhatsappPreviewUrl(null);
      }

      setLookupInput(newOrder.trackingToken || newOrder.orderId);
      setConfirmedOrder(newOrder);
      clearCart();
      setAppliedPromo(null);
      setPromoInput('');
      showToast(`Order #${newOrder.orderId} submitted to kitchen!`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not place order right now. Please try again.';
      setFormError(message);
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 md:px-8 pt-6 pb-8 space-y-6">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-4 md:p-5 shadow-xl border border-outline-variant/20">
        <div className="absolute -right-12 -top-12 w-36 h-36 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-36 h-36 bg-secondary-container/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center text-primary shadow-inner">
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">
                Checkout &amp; Feast Bag
              </span>
              <h1 className="font-[var(--font-display)] text-xl sm:text-2xl text-on-surface font-medium">
                Order Summary ({cartCount} {cartCount === 1 ? 'Item' : 'Items'})
              </h1>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-secondary-container text-on-secondary-container text-[11px] font-semibold uppercase tracking-wide">
            <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
            Sigdi Pit Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CART ITEMS & BILL BREAKDOWN */}
        <div className="lg:col-span-6 space-y-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-[var(--font-display)] text-xl text-primary flex items-center gap-2">
              <span>Cart Items</span>
              <span className="text-on-surface-variant font-sans text-xs font-medium">
                (Burns Road Hearth)
              </span>
            </h2>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="text-xs font-semibold text-secondary hover:text-on-surface transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">remove_shopping_cart</span>
                Clear
              </button>
            )}
          </div>

          {/* Cart Items List */}
          {cart.length === 0 ? (
            <div className="p-10 text-center bg-surface-container-low rounded-xl space-y-3 border border-outline-variant/15">
              <span className="material-symbols-outlined text-outline text-[42px]">
                soup_kitchen
              </span>
              <p className="text-base text-on-surface font-semibold">Your Sigdi Bag is Empty</p>
              <p className="text-xs text-on-surface-variant">
                Explore the royal menu to reignite the coals.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('menu-bbq')}
                className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-tertiary transition-colors cursor-pointer"
              >
                Browse Menu &amp; BBQ
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface-container-low rounded-xl p-3 flex gap-3 items-center shadow-md border border-outline-variant/15 transition-all"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-surface-container relative">
                    <ImageWithFallback
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-lg"
                      fallbackLabel={item.title}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[15px] font-semibold text-on-surface truncate">
                        {item.title}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.id)}
                        title="Remove item"
                        aria-label={`Remove ${item.title}`}
                        className="text-outline hover:text-secondary-fixed transition-colors p-1 cursor-pointer shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-1">
                      {item.subtitle || 'Charcoal grilled, royal spice blend'}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[15px] font-bold text-primary tabular-nums">
                        Rs. {(item.price * item.qty).toLocaleString('en-PK')}
                      </span>

                      <div className="flex items-center bg-surface-container-high rounded-lg p-0.5 text-on-surface">
                        <button
                          type="button"
                          onClick={() => decrementCartItem(item.id)}
                          aria-label={`Decrease quantity of ${item.title}`}
                          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-surface-bright active:scale-95 transition-all text-on-surface cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">remove</span>
                        </button>
                        <span className="text-xs font-bold px-2.5 text-on-surface tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          aria-label={`Increase quantity of ${item.title}`}
                          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-surface-bright active:scale-95 transition-all text-primary cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Promo Code Bar */}
          <div>
            <div className="bg-surface-container-lowest rounded-xl p-2.5 flex items-center gap-2 shadow-inner border border-outline-variant/20">
              <span className="material-symbols-outlined text-primary text-[20px] ml-1">
                loyalty
              </span>
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="Enter Royal Feast Voucher (e.g. BURNSROAD)"
                className="bg-transparent text-on-surface placeholder:text-outline text-xs flex-1 outline-none uppercase tracking-wider"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                className="bg-surface-container-high hover:bg-primary hover:text-on-primary text-primary text-[11px] px-3.5 py-2 rounded-lg transition-all font-bold uppercase tracking-wider cursor-pointer"
              >
                Apply
              </button>
            </div>
            {appliedPromo && (
              <p className="text-xs text-primary px-2 pt-1.5 font-medium">
                Applied {appliedPromo.code}: -Rs. {discountAmount.toLocaleString('en-PK')} discount
              </p>
            )}
            {promoError && (
              <p className="text-xs text-secondary px-2 pt-1.5 font-medium">{promoError}</p>
            )}
          </div>

          {/* Bill Breakdown Card */}
          <div className="bg-surface-container-low rounded-xl p-4 shadow-lg space-y-2.5 border border-outline-variant/15">
            <div className="flex justify-between items-center text-on-surface-variant text-sm">
              <span>Sigdi Platter Subtotal</span>
              <span className="text-on-surface font-semibold tabular-nums">
                Rs. {cartSubtotal.toLocaleString('en-PK')}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-primary text-sm">
                <span>Voucher Discount ({appliedPromo?.code})</span>
                <span className="font-semibold tabular-nums">
                  -Rs. {discountAmount.toLocaleString('en-PK')}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-on-surface-variant text-sm">
              <span className="flex items-center gap-1.5">
                Standard Thermal Delivery
                <span
                  className="material-symbols-outlined text-primary text-[16px]"
                  title="Delivered in temperature-locked insulated bag"
                >
                  moped
                </span>
              </span>
              <span className="text-on-surface font-semibold tabular-nums">
                Rs. {deliveryFee.toLocaleString('en-PK')}
              </span>
            </div>
            <div className="flex justify-between items-center text-on-surface-variant text-sm">
              <span>Government GST / Tax (5%) · Provincial</span>
              <span className="text-on-surface font-semibold tabular-nums">
                Rs. {taxAmount.toLocaleString('en-PK')}
              </span>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent my-1" />

            <div className="flex justify-between items-end pt-1">
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">
                  Total Royal Payable
                </span>
                <span className="font-[var(--font-display)] text-lg text-on-surface">
                  Net Amount
                </span>
              </div>
              <div className="text-right">
                <span className="font-[var(--font-display)] text-2xl text-primary font-bold tracking-tight block tabular-nums">
                  Rs. {grandTotal.toLocaleString('en-PK')}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Includes all municipal levies
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DELIVERY DETAILS, PAYMENT & DISPATCH CTAS */}
        <div className="lg:col-span-6 space-y-5">
          {/* 2. Customer Delivery & Contact Details Form */}
          <div className="bg-surface-container-low rounded-xl p-4 md:p-5 shadow-xl space-y-4 border border-outline-variant/15">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <div>
                <h2 className="font-[var(--font-display)] text-lg text-on-surface font-medium">
                  Delivery &amp; Guest Details
                </h2>
                <p className="text-xs text-on-surface-variant">
                  We bring the Burns Road coal flavors directly to your threshold.
                </p>
              </div>
            </div>

            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-1">
                <label
                  htmlFor="cust-name"
                  className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block"
                >
                  Full Name <span className="text-secondary">*</span>
                </label>
                <div className="relative flex items-center bg-surface-container-lowest rounded-lg px-3 py-2.5 focus-within:bg-surface-container transition-colors shadow-inner">
                  <span className="material-symbols-outlined text-outline text-[20px] mr-2">
                    person
                  </span>
                  <input
                    id="cust-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Muhammad Ali"
                    className="w-full bg-transparent text-on-surface placeholder:text-outline text-sm outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="cust-phone"
                  className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block"
                >
                  Mobile Phone Number <span className="text-secondary">*</span>
                </label>
                <div className="relative flex items-center bg-surface-container-lowest rounded-lg px-3 py-2.5 focus-within:bg-surface-container transition-colors shadow-inner">
                  <div className="flex items-center gap-1.5 pr-2 mr-2 bg-surface-container-high/60 py-0.5 px-2 rounded shrink-0">
                    <svg className="w-4 h-3 rounded-sm shadow-sm" fill="none" viewBox="0 0 900 600">
                      <rect fill="#01411C" height="600" width="900" />
                      <rect fill="#FFFFFF" height="600" width="225" />
                      <circle cx="562.5" cy="300" fill="#FFFFFF" r="180" />
                      <circle cx="607.5" cy="270" fill="#01411C" r="165" />
                      <polygon
                        fill="#FFFFFF"
                        points="562.5,180 577,222 622,222 586,248 600,290 562.5,264 525,290 539,248 503,222 548,222"
                      />
                    </svg>
                    <span className="text-xs text-on-surface font-semibold tabular-nums">+92</span>
                  </div>
                  <input
                    id="cust-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full bg-transparent text-on-surface placeholder:text-outline text-sm outline-none tabular-nums"
                  />
                </div>
              </div>

              <div className="pt-0.5 pb-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sameWhatsapp}
                    onChange={(e) => setSameWhatsapp(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#25D366]">
                      chat
                    </span>
                    WhatsApp number is identical to mobile phone
                  </span>
                </label>

                {!sameWhatsapp && (
                  <div className="mt-2 relative flex items-center bg-surface-container-lowest rounded-lg px-3 py-2.5 shadow-inner">
                    <span className="material-symbols-outlined text-[#25D366] text-[20px] mr-2">
                      chat
                    </span>
                    <input
                      type="tel"
                      value={altWhatsapp}
                      onChange={(e) => setAltWhatsapp(e.target.value)}
                      placeholder="Alternative WhatsApp: 03XX-XXXXXXX"
                      className="w-full bg-transparent text-on-surface placeholder:text-outline text-sm outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="cust-address"
                  className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block"
                >
                  Delivery Address <span className="text-secondary">*</span>
                </label>
                <div className="relative flex items-start bg-surface-container-lowest rounded-lg px-3 py-2.5 focus-within:bg-surface-container transition-colors shadow-inner">
                  <span className="material-symbols-outlined text-outline text-[20px] mr-2 mt-0.5">
                    home_pin
                  </span>
                  <textarea
                    id="cust-address"
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House / Flat No., Street, Sector/Block, Area"
                    className="w-full bg-transparent text-on-surface placeholder:text-outline text-sm outline-none resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="cust-landmark"
                    className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block"
                  >
                    Nearest Landmark
                  </label>
                  <div className="relative flex items-center bg-surface-container-lowest rounded-lg px-3 py-2.5 shadow-inner">
                    <span className="material-symbols-outlined text-outline text-[18px] mr-2">
                      pin_drop
                    </span>
                    <input
                      id="cust-landmark"
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Near Shell Pump"
                      className="w-full bg-transparent text-on-surface placeholder:text-outline text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="cust-notes"
                    className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block"
                  >
                    Pitmaster Instructions
                  </label>
                  <div className="relative flex items-center bg-surface-container-lowest rounded-lg px-3 py-2.5 shadow-inner">
                    <span className="material-symbols-outlined text-outline text-[18px] mr-2">
                      outdoor_grill
                    </span>
                    <input
                      id="cust-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Extra chutney, well-charred..."
                      className="w-full bg-transparent text-on-surface placeholder:text-outline text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* 3. Payment Method Selection */}
          <div className="bg-surface-container-low rounded-xl p-4 md:p-5 shadow-xl space-y-3 border border-outline-variant/15">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div>
                <h2 className="font-[var(--font-display)] text-lg text-on-surface font-medium">
                  Payment Preference
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Select how you wish to settle your royal bill.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {[
                {
                  value: 'Cash on Delivery (COD)',
                  tag: 'Recommended',
                  desc: 'Pay exact cash to thermal delivery rider',
                  icon: 'payments',
                },
                {
                  value: 'JazzCash / EasyPaisa',
                  tag: 'QR on Delivery',
                  desc: 'Instant mobile wallet QR transfer on arrival',
                  icon: 'contactless',
                },
                {
                  value: 'Credit / Debit Card',
                  tag: 'Visa / Mastercard',
                  desc: 'Pay via secure PayFast 256-bit gateway',
                  icon: 'credit_card',
                },
              ].map((opt) => {
                const selected = paymentMethod === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethod(opt.value)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all text-left border ${
                      selected
                        ? 'bg-surface-container-high border-primary/40'
                        : 'bg-surface-container-lowest hover:bg-surface-container border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          selected
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-transparent'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px] font-bold">
                          check
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-on-surface font-semibold">{opt.value}</span>
                          <span
                            className={`text-[10px] font-bold ${
                              selected ? 'text-primary' : 'text-on-surface-variant'
                            }`}
                          >
                            · {opt.tag}
                          </span>
                        </div>
                        <span className="text-xs text-on-surface-variant">{opt.desc}</span>
                      </div>
                    </div>
                    <span
                      className={`material-symbols-outlined text-[22px] shrink-0 ${
                        selected ? 'text-primary' : 'text-outline'
                      }`}
                    >
                      {opt.icon}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-error-container/60 text-on-error-container text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* 4. Instant Ordering Submission CTAs */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={placingOrder}
              onClick={() => handleSubmitOrder('whatsapp')}
              className="w-full bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white py-4 px-4 rounded-xl flex items-center justify-between gap-3 shadow-[0_10px_25px_rgba(37,211,102,0.28)] transition-all cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[26px]">chat</span>
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-sm sm:text-base font-bold">
                    {placingOrder ? 'Submitting to Kitchen...' : 'Confirm via WhatsApp'}
                  </span>
                  <span className="text-xs opacity-90 font-normal tabular-nums">
                    Direct 1-Tap Kitchen Ticket · Rs. {grandTotal.toLocaleString('en-PK')}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[20px]">bolt</span>
            </button>

            <button
              type="button"
              disabled={placingOrder}
              onClick={() => handleSubmitOrder('cod')}
              className="w-full bg-primary hover:bg-tertiary active:scale-[0.99] text-on-primary py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(212,175,55,0.22)] transition-all cursor-pointer disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[20px]">restaurant</span>
              <span>{placingOrder ? 'Saving Order...' : 'Place Standard Order'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>

          {/* 5. Hot & Fresh Guarantee Box */}
          <div className="bg-surface-container-low rounded-xl p-4 shadow-lg space-y-3 border border-outline-variant/15">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-container/50 text-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">verified</span>
              </div>
              <div>
                <h4 className="text-sm text-primary font-semibold">Hot &amp; Fresh Guarantee</h4>
                <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                  Dispatched in temperature-retaining sealed thermal containers directly from our
                  coals. Guaranteed piping hot at your door within{' '}
                  <strong className="text-on-surface font-semibold">35–45 minutes</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`tel:${config.landline.replace(/\s+/g, '')}`}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-primary text-[20px]">
                  support_agent
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] text-on-surface-variant block uppercase">
                    Order Helpline
                  </span>
                  <span className="text-xs text-on-surface font-semibold truncate block tabular-nums">
                    {config.landline}
                  </span>
                </div>
              </a>
              <a
                href={`https://wa.me/${config.whatsappLine.replace(/\D/g, '') || '923001234567'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[#25D366] text-[20px]">chat</span>
                <div className="min-w-0">
                  <span className="text-[10px] text-on-surface-variant block uppercase">
                    Live Kitchen Dispatch
                  </span>
                  <span className="text-xs text-on-surface font-semibold truncate block">
                    WhatsApp Desk
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Customer Order Tracker */}
      <section
        ref={trackerSectionRef}
        className="bg-surface-container-low rounded-xl p-4 md:p-5 shadow-xl border border-outline-variant/20 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">track_changes</span>
            </div>
            <div>
              <h2 className="font-[var(--font-display)] text-lg text-primary font-medium">
                Live Sigdi Order Tracker
              </h2>
              <p className="text-xs text-on-surface-variant">
                Real-time kitchen &amp; rider updates synced from Burns Road HQ
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setTrackedOrderId(lookupInput);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value.toUpperCase())}
              placeholder="Tracking Token (FKH-...)"
              className="bg-surface-container-lowest text-on-surface placeholder:text-outline text-xs px-3 py-2 rounded-lg border border-outline-variant/20 outline-none uppercase tracking-wider w-56"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-tertiary cursor-pointer"
            >
              Track
            </button>
          </form>
        </div>

        {trackedOrderLoading ? (
          <p className="text-xs text-on-surface-variant py-2">Connecting to live kitchen feed...</p>
        ) : trackedOrder ? (
          <div className="space-y-4 bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/15">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary tabular-nums">
                  #{trackedOrder.orderId}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded ${
                    trackedOrder.orderStatus === 'Cancelled'
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-primary/20 text-primary'
                  }`}
                >
                  {trackedOrder.orderStatus}
                </span>
              </div>
              {trackedOrder.etaMinutes !== undefined &&
                trackedOrder.orderStatus !== 'Delivered' &&
                trackedOrder.orderStatus !== 'Cancelled' && (
                  <span className="text-xs text-on-surface-variant tabular-nums">
                    Estimated Arrival: <strong className="text-primary">{trackedOrder.etaMinutes} mins</strong>
                  </span>
                )}
            </div>

            {trackedOrder.orderStatus === 'Cancelled' ? (
              <div className="p-3 rounded-lg bg-error-container/50 text-on-error-container text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                <span>
                  This order was cancelled. Please contact {config.landline} for assistance.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {TRACKING_STEPS.map((step, idx) => {
                  const activeIndex = TRACKING_STEPS.findIndex(
                    (s) => s.status === trackedOrder.orderStatus
                  );
                  const reached = activeIndex >= idx;
                  const isCurrent = activeIndex === idx;
                  return (
                    <div
                      key={step.status}
                      className={`p-2.5 rounded-lg border text-center flex flex-col items-center gap-1 transition-all ${
                        isCurrent
                          ? 'bg-primary/15 border-primary text-primary'
                          : reached
                          ? 'bg-surface-container-low border-primary/30 text-on-surface'
                          : 'bg-surface-container-low/40 border-outline-variant/10 text-outline'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
                      <span className="text-[11px] font-semibold leading-tight">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : trackedOrderError ? (
          <p className="text-xs text-error font-medium">{trackedOrderError}</p>
        ) : trackedOrderId ? (
          <p className="text-xs text-on-surface-variant">
            No live tracking record found for token <strong className="text-on-surface">#{trackedOrderId}</strong>. Check your token and try again.
          </p>
        ) : (
          <p className="text-xs text-on-surface-variant">
            Place an order above or enter your secure Order Tracking Token (e.g. FKH-...) to watch live preparation and dispatch updates.
          </p>
        )}
      </section>

      {/* Clear Cart Confirmation Modal */}
      {confirmClearOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmClearOpen(false)}
        >
          <div
            className="bg-surface-container-low max-w-sm w-full rounded-2xl p-5 shadow-2xl border border-outline-variant/20 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-[var(--font-display)] text-lg text-on-surface font-semibold">
              Clear your feast bag?
            </h3>
            <p className="text-xs text-on-surface-variant">
              All items currently in your Sigdi tray will be removed.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="flex-1 py-2.5 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer"
              >
                Keep Items
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setAppliedPromo(null);
                  setConfirmClearOpen(false);
                  showToast('Feast bag cleared', 'remove_shopping_cart');
                }}
                className="flex-1 py-2.5 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-bold cursor-pointer"
              >
                Yes, Clear Bag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Realtime Kitchen Order Confirmation Modal */}
      {confirmedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setConfirmedOrder(null)}
        >
          <div
            className="bg-surface-container-low max-w-md w-full rounded-2xl p-6 shadow-2xl border border-primary/25 space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-[34px]">restaurant_menu</span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-primary uppercase tracking-widest block">
                Order #{confirmedOrder.orderId}
              </span>
              {confirmedOrder.trackingToken && (
                <span className="text-[10px] font-mono text-on-surface-variant block">
                  Tracking Token: {confirmedOrder.trackingToken}
                </span>
              )}
              <h3 className="font-[var(--font-display)] text-2xl text-on-surface">
                Sigdi Fire Ignition!
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Your authentic royal order has been saved to our Burns Road kitchen queue. Track
                live status updates below.
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-3 flex items-center justify-between text-left border border-outline-variant/15">
              <div>
                <span className="text-[10px] text-outline block uppercase font-bold">
                  Estimated Delivery
                </span>
                <span className="text-sm text-primary font-bold tabular-nums">35 - 45 Mins</span>
              </div>
              <div className="flex items-center gap-1.5 text-on-surface text-xs font-medium">
                <span className="material-symbols-outlined text-secondary text-[20px]">moped</span>
                <span>{confirmedOrder.destinationShort || 'Karachi Dispatch'}</span>
              </div>
            </div>

            {whatsappPreviewUrl && (
              <div className="bg-surface-container rounded-xl p-3 text-left space-y-2 border border-[#25D366]/30">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#25D366] uppercase tracking-wider">
                    WhatsApp Kitchen Ticket Ready
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(whatsappMessageText);
                      showToast('Ticket copied to clipboard');
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Copy Text
                  </button>
                </div>
                <pre className="text-[11px] text-on-surface-variant whitespace-pre-wrap font-sans max-h-28 overflow-y-auto">
                  {whatsappMessageText}
                </pre>
                <a
                  href={whatsappPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-lg bg-[#25D366] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  <span>Send Ticket on WhatsApp</span>
                </a>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  trackerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-primary hover:bg-tertiary text-on-primary py-3 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Track Order Status Live
              </button>
              <button
                type="button"
                onClick={() => setConfirmedOrder(null)}
                className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Dismiss Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
