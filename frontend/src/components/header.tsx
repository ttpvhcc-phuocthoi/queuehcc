import { Component } from "react";

export default class Header extends Component {
    render(){
        return <header className="display-board__header">
                    <div className="header-logo" aria-label="Logo hệ thống">
                        <img src="https://vienthongcantho.com.vn/logo.png" alt="" width="120" height="120" decoding="async" />
                    </div>
                    <div className="header-title-block">
                        <p className="line-eyebrow">ỦY BAN NHÂN DÂN PHƯỜNG PHƯỚC THỚI</p>
                        <p className="line1">TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG</p>
                        <p className="line2">PHƯỜNG PHƯỚC THỚI</p>
                    </div>
                </header>;
    }
}