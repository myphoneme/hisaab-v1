import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  ShoppingCart,
  CreditCard,
  BarChart3,
  Settings,
  Receipt,
  BookOpen,
  Landmark,
  MapPin,
  Wallet,
  Tag,
  FolderKanban,
  Package,
  ClipboardList,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Vendors', href: '/vendors', icon: Building2 },
  { name: 'Branches', href: '/branches', icon: MapPin },
  { name: 'Bank Accounts', href: '/bank-accounts', icon: Landmark },
  { name: 'Items', href: '/items', icon: Package },
  { name: 'Client POs', href: '/client-pos', icon: ClipboardList },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Cash Expenses', href: '/cash-expenses', icon: Wallet },
  { name: 'Expense Categories', href: '/expense-categories', icon: Tag },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Ledger', href: '/ledger', icon: BookOpen },
  { name: 'GST Reports', href: '/reports/gst', icon: Receipt },
  { name: 'Expected Income', href: '/reports/expected-income', icon: TrendingUp },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <div className="flex flex-col w-64 bg-gray-900 min-h-screen" data-sidebar>
      <div className="flex items-center justify-center h-16 px-4 bg-gray-800">
        <h1 className="text-xl font-bold text-white">Hisaab</h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )
            }
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-400">Financial Year: 2024-25</p>
      </div>
    </div>
  );
}
