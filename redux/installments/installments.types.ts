// redux/installments/installments.types.ts

// add fields so we can tell if the row exists on server
export type InstallmentRow = {
    amount: string; // digits
    due: string; // DD/MM/YYYY
    paymentId?: string; // server id if persisted
    isPaid?: boolean; // manual UI status
    _localId?: string; // UI key (optional)
};

export type AddInstallmentsPayload = {
    clientId: string;
    payments: Array<{ amount: number; date: string; isPaid?: boolean }>; // date => "YYYY-MM-DD"
};

export type DeleteInstallmentPayload = {
    clientId: string;
    paymentId: string;
};

export type AddInstallmentsSuccess = {
    message?: string;
    data?: {
        client?: Record<string, any>;
        totalPaid?: number;
        remainingBalance?: number;
    };
};

export type DeleteInstallmentSuccess = {
    message?: string;
    data?: {
        deletedPayment?: {
            id: string;
            amount: number;
            date: string; // ISO
        };
        totalPaid?: number;
        remainingBalance?: number;
        client?: Record<string, any>;
    };
};

export type InstallmentsErrorDetail = {
    message?: string;
    details?: {
        payableAmount?: number;
        totalAlreadyPaid?: number;
        remainingBalance?: number;
        totalNewPayments?: number;
        excess?: number;
    };
};

export type InstallmentsState = {
    // form
    clientId: string;
    rows: InstallmentRow[];
    totalAmount: string; // digits only
    amountPaid: string; // digits only

    // network
    adding: boolean;
    deleting: boolean;
    error: string | null;
    errorDetail: InstallmentsErrorDetail["details"] | null;

    // last results
    lastAdd?: AddInstallmentsSuccess["data"] | null;
    lastDelete?: DeleteInstallmentSuccess["data"] | null;
};
