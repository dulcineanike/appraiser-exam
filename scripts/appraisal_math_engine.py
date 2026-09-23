"""
不動產估價師專用 Python 確定性算力驗算引擎
Appraisal & Financial Math Engine for Real Estate Appraiser Examination
涵蓋：土地開發分析法、收益法推算、投資財務指標、比較法調整百分比檢核
"""

import math

class AppraisalMathEngine:
    @staticmethod
    def land_development_analysis(S, R, i, C, M, r=0.0):
        """
        土地開發分析法 (Land Development Analysis / Residual Method)
        公式依據：《不動產估價技術規則》第77條、第78條、公會第5號公報
        V = [S / ((1 + R) * (1 + i)) - (C + M)] / (1 + r)
        
        S: 開發總銷售金額 (元或萬元)
        R: 適當之利潤率 (例如 0.15 即 15%)
        i: 總成本之資本利息綜合利率 (例如 0.05 即 5%)
        C: 營造施工費 (直接成本)
        M: 規劃設計、廣告銷售、管理費及稅費 (間接成本)
        r: 土地取得之資本利息綜合利率 (通常同i或依個案認定，若併計則r=0或指定比率)
        """
        discounted_sales = S / ((1.0 + R) * (1.0 + i))
        costs = C + M
        residual = discounted_sales - costs
        land_value = residual / (1.0 + r)
        
        return {
            "S_total_sales": S,
            "R_profit_rate": R,
            "i_interest_rate": i,
            "C_direct_cost": C,
            "M_indirect_cost": M,
            "discounted_sales": round(discounted_sales, 2),
            "total_costs": round(costs, 2),
            "land_value_V": round(land_value, 2),
            "formula_str": "V = [S / ((1 + R) * (1 + i)) - (C + M)] / (1 + r)"
        }

    @staticmethod
    def direct_capitalization(net_income_a, cap_rate_R):
        """
        收益法－直接資本化法 (Direct Capitalization Method)
        公式依據：《不動產估價技術規則》第28條、公會第3號公報
        P = a / R
        
        net_income_a: 客觀一年淨收益 (元)
        cap_rate_R: 收益資本化率 (如 0.025 即 2.5%)
        """
        if cap_rate_R <= 0:
            raise ValueError("收益資本化率必須大於0")
        price = net_income_a / cap_rate_R
        return {
            "net_income_a": net_income_a,
            "cap_rate_R": cap_rate_R,
            "income_price_P": round(price, 2),
            "formula_str": "P = a / R"
        }

    @staticmethod
    def band_of_investment_dcr(LTV, mortgage_constant_MC, DCR):
        """
        債務保障比率法 (Debt Coverage Ratio Method 推算綜合資本化率 R)
        公式依據：《不動產估價技術規則》第39條
        R = LTV * MC * DCR
        """
        R = LTV * mortgage_constant_MC * DCR
        return {
            "LTV": LTV,
            "MC": mortgage_constant_MC,
            "DCR": DCR,
            "cap_rate_R": round(R, 4),
            "cap_rate_percent": f"{round(R * 100, 2)}%",
            "formula_str": "R = LTV * MC * DCR"
        }

    @staticmethod
    def weighted_average_cost_of_capital(LTV, mortgage_rate_or_MC, equity_ratio, equity_yield_Ye):
        """
        融資綜合體法 (Band of Investment Method)
        公式依據：《不動產估價技術規則》第38條、公會第3號公報
        R = LTV * Rm + (1 - LTV) * Re
        """
        R = (LTV * mortgage_rate_or_MC) + (equity_ratio * equity_yield_Ye)
        return {
            "LTV": LTV,
            "Rm": mortgage_rate_or_MC,
            "equity_ratio": equity_ratio,
            "Re": equity_yield_Ye,
            "cap_rate_R": round(R, 4),
            "cap_rate_percent": f"{round(R * 100, 2)}%",
            "formula_str": "R = LTV * Rm + (1 - LTV) * Re"
        }

    @staticmethod
    def building_residual_method(total_net_income, land_value_L, land_cap_rate_RL, building_cap_rate_RB):
        """
        建物殘餘法 (Building Residual Method)
        公式依據：《不動產估價技術規則》第42條
        PB = (a - L * RL) / RB
        """
        land_income = land_value_L * land_cap_rate_RL
        building_income = total_net_income - land_income
        building_value = building_income / building_cap_rate_RB
        return {
            "total_income_a": total_net_income,
            "land_income": round(land_income, 2),
            "building_income": round(building_income, 2),
            "building_value_PB": round(building_value, 2),
            "formula_str": "PB = (a - L * RL) / RB"
        }

    @staticmethod
    def npv_and_irr(cash_flows, discount_rate=0.0):
        """
        淨現值 (NPV) 與 內部報酬率 (IRR)
        cash_flows: [CF0, CF1, CF2, ..., CFn]，其中 CF0 通常為負值 (期初投入成本)
        """
        # Calculate NPV at discount_rate
        npv = sum(cf / ((1.0 + discount_rate) ** t) for t, cf in enumerate(cash_flows))
        
        # Binary search / Newton method for IRR
        low = -0.99
        high = 5.0
        irr = None
        for _ in range(100):
            mid = (low + high) / 2.0
            npv_mid = sum(cf / ((1.0 + mid) ** t) for t, cf in enumerate(cash_flows))
            if abs(npv_mid) < 0.0001:
                irr = mid
                break
            # Derivative or sign check
            npv_low = sum(cf / ((1.0 + low) ** t) for t, cf in enumerate(cash_flows))
            if (npv_mid > 0 and npv_low > 0) or (npv_mid < 0 and npv_low < 0):
                low = mid
            else:
                high = mid
        if irr is None:
            irr = (low + high) / 2.0
            
        return {
            "cash_flows": cash_flows,
            "discount_rate": discount_rate,
            "npv": round(npv, 2),
            "irr": round(irr, 4),
            "irr_percent": f"{round(irr * 100, 2)}%"
        }

    @staticmethod
    def financial_leverage_check(ROE, total_yield_ROA, interest_rate_i):
        """
        財務槓桿檢核 (Financial Leverage)
        若 ROA > i，則為正財務槓桿 (Positive Leverage)，舉債提高 ROE
        若 ROA < i，則為負財務槓桿 (Negative Leverage)，舉債反噬資本
        """
        is_positive = total_yield_ROA > interest_rate_i
        status = "正財務槓桿 (Positive Leverage)" if is_positive else ("中性槓桿" if total_yield_ROA == interest_rate_i else "負財務槓桿 (Negative Leverage)")
        return {
            "ROA": total_yield_ROA,
            "interest_rate": interest_rate_i,
            "ROE": ROE,
            "leverage_status": status,
            "analysis": f"總資產報酬率 ({round(total_yield_ROA*100, 2)}%) {'高於' if is_positive else '低於'} 借款利率 ({round(interest_rate_i*100, 2)}%)，產生{status}。"
        }

    @staticmethod
    def comparison_adjustment_check(factors_dict):
        """
        比較法調整百分比法定檢核
        依據：《不動產估價技術規則》第25條
        1. 情況修正率、價格日期修正率、區域因素、個別因素
        2. 個別因素修正率不得超過 15% (即 0.85 ~ 1.15)
        3. 總修正率不得超過 30% (即總調整乘積需在 0.70 ~ 1.30 內)
        """
        total_multiplier = 1.0
        details = []
        violations = []
        
        for factor_name, rate in factors_dict.items():
            total_multiplier *= rate
            diff = abs(rate - 1.0)
            details.append(f"{factor_name}: {rate} (變動幅度: {round(diff*100, 1)}%)")
            if "個別因素" in factor_name and diff > 0.15:
                violations.append(f"【違規】{factor_name}修正幅度 {round(diff*100, 1)}% 超過技術規則第25條之 15% 上限！")
                
        total_diff = abs(total_multiplier - 1.0)
        if total_diff > 0.30:
            violations.append(f"【違規】總修正率幅度 {round(total_diff*100, 1)}% 超過技術規則第25條之 30% 上限，該比較標的應予排除！")
            
        return {
            "total_multiplier": round(total_multiplier, 4),
            "details": details,
            "violations": violations,
            "is_valid": len(violations) == 0
        }

if __name__ == "__main__":
    # Test Engine
    print("Testing Appraisal Math Engine...")
    ldc = AppraisalMathEngine.land_development_analysis(S=10000, R=0.15, i=0.05, C=4000, M=800)
    print("LDC Land Value:", ldc["land_value_V"], "萬元")
    
    cap = AppraisalMathEngine.direct_capitalization(120, 0.025)
    print("Direct Cap Value:", cap["income_price_P"], "萬元")
    
    dcr_r = AppraisalMathEngine.band_of_investment_dcr(LTV=0.7, mortgage_constant_MC=0.06, DCR=1.2)
    print("DCR Cap Rate:", dcr_r["cap_rate_percent"])
    
    fin = AppraisalMathEngine.financial_leverage_check(0.12, 0.08, 0.03)
    print("Leverage:", fin["leverage_status"])
    print("All Math Engine tests passed!")
