import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Phone, Loader, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import Modal from './Modal';

const MpesaPaymentModal = ({
  isOpen,
  onClose,
  onSuccess,
  // For subscription payments
  plan,
  months,
  // For invoice payments
  invoiceId,
  invoiceAmount,
  // Type: 'subscription' or 'invoice'
  type = 'subscription',
}) => {
  const [phone, setPhone]               = useState('');
  const [phoneError, setPhoneError]     = useState('');
  const [paymentState, setPaymentState] = useState('idle'); // idle | pending | polling | success | failed
  const [checkoutId, setCheckoutId]     = useState(null);
  const [pollCount, setPollCount]       = useState(0);

  const prices = { basic: 3000, premium: 6500 };
  const amount = type === 'subscription'
    ? (prices[plan] || 0) * (months || 1)
    : invoiceAmount;

  // Poll payment status every 5 seconds after STK push
  useEffect(() => {
    if (paymentState !== 'polling' || !checkoutId) return;

    const interval = setInterval(async () => {
      try {
        const res = await axiosInstance.get(`/mpesa/status/${checkoutId}`);
        const { result_code, transaction } = res.data.data;

        setPollCount(prev => prev + 1);

        if (transaction?.status === 'completed') {
          setPaymentState('success');
          clearInterval(interval);
          toast.success('Payment successful! 🎉');
          setTimeout(() => { onSuccess?.(); onClose(); }, 2000);
        } else if (transaction?.status === 'failed') {
          setPaymentState('failed');
          clearInterval(interval);
        }

        // Stop polling after 12 attempts (1 minute)
        if (pollCount >= 12) {
          clearInterval(interval);
          setPaymentState('failed');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [paymentState, checkoutId, pollCount]);

  const stkMutation = useMutation({
    mutationFn: (data) => {
      const endpoint = type === 'subscription'
        ? '/mpesa/stk/subscription'
        : '/mpesa/stk/invoice';
      return axiosInstance.post(endpoint, data).then(r => r.data);
    },
    onSuccess: (data) => {
      setCheckoutId(data.data.checkout_request_id);
      setPaymentState('polling');
      toast.success('Check your phone for the M-Pesa prompt!');
    },
    onError: (err) => {
      setPaymentState('failed');
      toast.error(err.response?.data?.message || 'Payment initiation failed.');
    },
  });

  const validatePhone = (val) => {
    const cleaned = val.replace(/\s/g, '');
    const kenyan  = /^(07|01|\+2547|\+2541|2547|2541)\d{8}$/.test(cleaned);
    return kenyan;
  };

  const handleSubmit = () => {
    setPhoneError('');
    if (!validatePhone(phone)) {
      setPhoneError('Please enter a valid Kenyan phone number (e.g. 0712345678)');
      return;
    }

    setPaymentState('pending');
    const payload = type === 'subscription'
      ? { phone, plan, months }
      : { phone, invoice_id: invoiceId };

    stkMutation.mutate(payload);
  };

  const handleClose = () => {
    if (paymentState === 'polling') {
      if (!window.confirm('Payment is in progress. Are you sure you want to close?')) return;
    }
    setPhone('');
    setPhoneError('');
    setPaymentState('idle');
    setCheckoutId(null);
    setPollCount(0);
    onClose();
  };

  const title = type === 'subscription'
    ? `Pay for ${plan?.charAt(0).toUpperCase() + plan?.slice(1)} Plan`
    : 'Pay Invoice via M-Pesa';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="space-y-4">

        {/* Amount Display */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-white/50 text-xs mb-1">Amount to Pay</p>
          <p className="text-white font-bold text-3xl">
            KES {amount?.toLocaleString()}
          </p>
          {type === 'subscription' && (
            <p className="text-white/40 text-xs mt-1 capitalize">
              {plan} plan — {months} month{months > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Idle State — Phone Input */}
        {paymentState === 'idle' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-sm font-medium">M-Pesa Phone Number</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  placeholder="0712 345 678"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                  className={`w-full bg-white/10 border rounded-xl px-4 py-2.5 pl-10
                    text-white placeholder-white/30 text-sm focus:outline-none
                    focus:ring-2 focus:ring-emerald-500/50 transition-all
                    ${phoneError ? 'border-red-400/50' : 'border-white/20'}`}
                />
              </div>
              {phoneError && <p className="text-red-400 text-xs">{phoneError}</p>}
              <p className="text-white/30 text-xs">
                Enter the M-Pesa registered phone number to receive the payment prompt.
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <p className="text-white/50 text-xs font-semibold mb-2">How it works:</p>
              <div className="space-y-1.5 text-xs text-white/40">
                <p>1. Enter your M-Pesa phone number above</p>
                <p>2. Click "Pay Now" — you'll get a prompt on your phone</p>
                <p>3. Enter your M-Pesa PIN to confirm payment</p>
                <p>4. Your {type === 'subscription' ? 'subscription' : 'invoice'} will be activated automatically</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleClose}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button onClick={handleSubmit}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500
                  hover:from-emerald-600 hover:to-teal-600 text-white font-bold
                  rounded-xl py-2.5 text-sm shadow-lg shadow-emerald-500/30 transition-all">
                Pay Now
              </button>
            </div>
          </>
        )}

        {/* Pending State */}
        {paymentState === 'pending' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30
              flex items-center justify-center">
              <Loader size={28} className="text-blue-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">Sending payment request...</p>
              <p className="text-white/50 text-sm mt-1">Please wait</p>
            </div>
          </div>
        )}

        {/* Polling State */}
        {paymentState === 'polling' && (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20
                border-t-emerald-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Phone size={20} className="text-emerald-400" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">Waiting for payment...</p>
              <p className="text-white/50 text-sm mt-1">
                Check your phone ({phone}) for the M-Pesa prompt
              </p>
              <p className="text-white/30 text-xs mt-2">
                Enter your PIN to complete payment
              </p>
            </div>
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-emerald-500/50 animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <button onClick={() => setPaymentState('idle')}
              className="text-white/30 hover:text-white/60 text-xs transition-colors">
              Cancel and try again
            </button>
          </div>
        )}

        {/* Success State */}
        {paymentState === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30
              flex items-center justify-center">
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">Payment Successful! 🎉</p>
              <p className="text-white/50 text-sm mt-1">
                {type === 'subscription'
                  ? 'Your subscription has been activated.'
                  : 'Invoice has been marked as paid.'}
              </p>
            </div>
          </div>
        )}

        {/* Failed State */}
        {paymentState === 'failed' && (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30
              flex items-center justify-center">
              <XCircle size={32} className="text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold">Payment Failed</p>
              <p className="text-white/50 text-sm mt-1">
                The payment was not completed. Please try again.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={handleClose}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Close
              </button>
              <button onClick={() => setPaymentState('idle')}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500
                  text-white font-bold rounded-xl py-2.5 text-sm transition-all">
                Try Again
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};

export default MpesaPaymentModal;