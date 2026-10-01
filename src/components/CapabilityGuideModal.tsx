import React from 'react';
import { 
  X, 
  ShieldCheck, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Cpu, 
  CornerDownRight, 
  Layers,
  FileCheck
} from 'lucide-react';

interface CapabilityGuideModalProps {
  onClose: () => void;
}

export const CapabilityGuideModal: React.FC<CapabilityGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full text-slate-100 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">“通用智能项目底座”能力边界与使用说明</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs sm:text-sm text-slate-300 leading-relaxed">
          
          {/* Section 1 */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-100 flex items-center space-x-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>1. 本底座能为你解决什么？（100% 舒适区）</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1 text-xs">
              <li><strong>彻底告别命令行与环境依赖</strong>：你不需要在本地安装 Python、Node.js、Docker 或 Conda，直接在浏览器可视化操作。</li>
              <li><strong>多阶段步进式任务链</strong>：将复杂工作拆解为初筛、推理、专项分析、总结归档，每一步状态与产出透明可见。</li>
              <li><strong>二级子任务智能跳过</strong>：内置判定引擎，若初筛未达到触发条件或用户未勾选，自动跳过二级重度子任务，显著节约 Token 与时间。</li>
              <li><strong>全方位监控与一键排障</strong>：记录每次调用的输入/输出 Token，遇到任何报错点击“一键生成排障报告”，复制直接发给我即可秒级诊断。</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <h4 className="font-bold text-slate-100 flex items-center space-x-1.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>2. 真实能力边界与客观限制</span>
            </h4>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-2 text-xs text-slate-400">
              <p>
                <strong>网络与桌面自动化边界</strong>：本平台运行于云端安全沙箱，无法直接控制你本机的鼠标键盘（例如自动点击你电脑屏幕上的微信或本地安装的专业软件）。
              </p>
              <p>
                <strong>非标 C++ / 本地重型模型边界</strong>：网上部分开源项目必须强制调用本地独立显卡跑本地大模型（如 Ollama、重型本地深度学习库），此类项目无法直接“零配置”扔到浏览器运行，但可以通过标准 API 方式或我们提供的 Agent-Manifest 格式进行逻辑迁移。
              </p>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <h4 className="font-bold text-slate-100 flex items-center space-x-1.5 text-sm">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>3. 办公日常怎么用最省心？</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1 text-xs">
              <li>在导航栏选择所需业务场景（如合同审计、行业研报、内容矩阵）。</li>
              <li>在左侧填入或粘贴你的原始材料（可点击“载入示例办公数据”快速体验）。</li>
              <li>点击“一键启动任务”，观察拓扑图中节点的推进变化与智能跳过判断。</li>
              <li>在右下角复制或导出 Markdown 归档成果；如果遇到问题，在“排障日志”页面复制排障代码块发给我就行。</li>
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
          >
            我知道了，开始使用
          </button>
        </div>

      </div>
    </div>
  );
};
